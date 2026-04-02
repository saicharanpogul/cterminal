import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { onPtyImage, type InlineImageData } from "@/lib/tauri";

interface DisplayImage {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  timestamp: number;
}

interface InlineImageOverlayProps {
  sessionId: string;
}

export function InlineImageOverlay({ sessionId }: InlineImageOverlayProps) {
  const [images, setImages] = useState<DisplayImage[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    onPtyImage((event) => {
      if (event.session_id !== sessionId) return;

      const url = imageDataToUrl(event.image);
      if (!url) return;

      const img: DisplayImage = {
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        url,
        width: event.image.width,
        height: event.image.height,
        timestamp: Date.now(),
      };

      setImages((prev) => [...prev.slice(-19), img]); // Keep last 20
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [sessionId]);

  if (images.length === 0) return null;

  const expandedImage = expandedId
    ? images.find((i) => i.id === expandedId)
    : null;

  return (
    <>
      {/* Thumbnail strip at top-right */}
      <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-1">
        {images.slice(-5).map((img) => (
          <button
            key={img.id}
            onClick={() => setExpandedId(img.id)}
            className="group relative rounded overflow-hidden border border-border/50 hover:border-accent/50 transition-colors shadow-lg"
          >
            <img
              src={img.url}
              alt=""
              className="max-w-[120px] max-h-[80px] object-contain bg-surface-2"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-[9px] text-white font-medium">View</span>
            </div>
          </button>
        ))}
      </div>

      {/* Expanded image modal */}
      {expandedImage && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setExpandedId(null)}
        >
          <div
            className="relative max-w-[90%] max-h-[90%] rounded-lg overflow-hidden border border-border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setExpandedId(null)}
              className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded bg-surface-2/80 hover:bg-surface-3 text-text-secondary transition-colors"
            >
              <X size={12} />
            </button>
            <img
              src={expandedImage.url}
              alt=""
              className="max-w-full max-h-[80vh] object-contain bg-surface-1"
            />
            <div className="px-3 py-1.5 bg-surface-2 text-[10px] text-text-muted">
              {expandedImage.width && expandedImage.height
                ? `${expandedImage.width} x ${expandedImage.height}`
                : "Image"}
              <span className="ml-2">
                {new Date(expandedImage.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function imageDataToUrl(image: InlineImageData): string | null {
  try {
    const bytes = new Uint8Array(image.data);
    const mime = image.mime_type ?? detectMime(bytes) ?? "image/png";
    const blob = new Blob([bytes], { type: mime });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

function detectMime(data: Uint8Array): string | null {
  if (data.length < 4) return null;
  if (data[0] === 0x89 && data[1] === 0x50) return "image/png";
  if (data[0] === 0xff && data[1] === 0xd8) return "image/jpeg";
  if (data[0] === 0x47 && data[1] === 0x49) return "image/gif";
  return null;
}
