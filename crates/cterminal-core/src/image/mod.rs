use serde::{Deserialize, Serialize};

/// Represents an inline image detected from terminal escape sequences.
/// Supports Kitty graphics protocol, iTerm2 inline images, and Sixel.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InlineImage {
    pub protocol: ImageProtocol,
    pub data: Vec<u8>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub mime_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ImageProtocol {
    Kitty,
    Iterm2,
    Sixel,
}

/// Scans raw terminal output bytes for image protocol sequences.
/// Returns (non-image data, detected images).
///
/// Kitty protocol: ESC_G ... ESC\ or ESC]...ST
/// iTerm2 protocol: ESC]1337;File=...:<base64>BEL or ESC]1337;File=...:<base64>ST
/// Sixel: ESC P ... ESC \
pub fn extract_images(data: &[u8]) -> (Vec<u8>, Vec<InlineImage>) {
    let mut clean = Vec::with_capacity(data.len());
    let mut images = Vec::new();
    let mut i = 0;

    while i < data.len() {
        // Look for ESC (0x1b)
        if data[i] == 0x1b && i + 1 < data.len() {
            // iTerm2 inline image: ESC ] 1337 ; File = ...
            if let Some((img, end)) = try_parse_iterm2(&data[i..]) {
                images.push(img);
                i += end;
                continue;
            }

            // Kitty graphics protocol: ESC _ G ... ESC \
            if let Some((img, end)) = try_parse_kitty(&data[i..]) {
                images.push(img);
                i += end;
                continue;
            }

            // Sixel: ESC P ... ESC \
            if let Some((img, end)) = try_parse_sixel(&data[i..]) {
                images.push(img);
                i += end;
                continue;
            }
        }

        clean.push(data[i]);
        i += 1;
    }

    (clean, images)
}

fn try_parse_iterm2(data: &[u8]) -> Option<(InlineImage, usize)> {
    // ESC ] 1337 ; File = [params] : <base64> BEL
    // or ESC ] 1337 ; File = [params] : <base64> ESC \
    if data.len() < 15 {
        return None;
    }

    // Check for ESC ] 1337 ; File =
    if !(data[0] == 0x1b && data[1] == b']') {
        return None;
    }

    let header = b"1337;File=";
    let start = 2;
    if data.len() < start + header.len() {
        return None;
    }
    if &data[start..start + header.len()] != header {
        return None;
    }

    // Find the colon separating params from data
    let params_start = start + header.len();
    let mut colon_pos = None;
    for j in params_start..data.len() {
        if data[j] == b':' {
            colon_pos = Some(j);
            break;
        }
        // Safety: don't scan forever
        if j - params_start > 4096 {
            return None;
        }
    }
    let colon_pos = colon_pos?;

    // Parse params (key=value;key=value)
    let params_str = std::str::from_utf8(&data[params_start..colon_pos]).ok()?;
    let mut width = None;
    let mut height = None;
    let mut _size = None;
    let mut _name = None;
    let mut _inline = false;

    for param in params_str.split(';') {
        if let Some((key, value)) = param.split_once('=') {
            match key {
                "width" => width = value.parse().ok(),
                "height" => height = value.parse().ok(),
                "size" => _size = value.parse::<usize>().ok(),
                "name" => _name = Some(value.to_string()),
                "inline" => _inline = value == "1",
                _ => {}
            }
        }
    }

    // Find terminator: BEL (0x07) or ST (ESC \)
    let data_start = colon_pos + 1;
    let mut end_pos = None;
    for j in data_start..data.len() {
        if data[j] == 0x07 {
            end_pos = Some((j, j + 1));
            break;
        }
        if data[j] == 0x1b && j + 1 < data.len() && data[j + 1] == b'\\' {
            end_pos = Some((j, j + 2));
            break;
        }
    }
    let (data_end, seq_end) = end_pos?;

    // Decode base64 image data
    let b64_str = std::str::from_utf8(&data[data_start..data_end]).ok()?;
    let image_data = base64_decode(b64_str)?;

    let mime_type = detect_mime(&image_data);

    Some((
        InlineImage {
            protocol: ImageProtocol::Iterm2,
            data: image_data,
            width,
            height,
            mime_type,
        },
        seq_end,
    ))
}

fn try_parse_kitty(data: &[u8]) -> Option<(InlineImage, usize)> {
    // Kitty: ESC _ G <payload> ESC \
    // or APC: ESC _ G ... ST
    if data.len() < 5 {
        return None;
    }
    if !(data[0] == 0x1b && data[1] == b'_' && data[2] == b'G') {
        return None;
    }

    // Find terminator: ESC \
    let mut end_pos = None;
    for j in 3..data.len() {
        if data[j] == 0x1b && j + 1 < data.len() && data[j + 1] == b'\\' {
            end_pos = Some((j, j + 2));
            break;
        }
    }
    let (payload_end, seq_end) = end_pos?;

    let payload = &data[3..payload_end];

    // Kitty payload: control_data,payload_data
    // separated by ;
    let payload_str = std::str::from_utf8(payload).ok()?;

    // Find the payload separator (the data part after params)
    let (params_part, data_part) = if let Some(idx) = payload_str.find(';') {
        (&payload_str[..idx], &payload_str[idx + 1..])
    } else {
        // Could be just params with data in subsequent chunks
        return None;
    };

    // Parse params
    let mut width = None;
    let mut height = None;
    for param in params_part.split(',') {
        if let Some((key, value)) = param.split_once('=') {
            match key {
                "s" => width = value.parse().ok(),  // source width
                "v" => height = value.parse().ok(), // source height
                _ => {}
            }
        }
    }

    let image_data = base64_decode(data_part)?;
    let mime_type = detect_mime(&image_data);

    Some((
        InlineImage {
            protocol: ImageProtocol::Kitty,
            data: image_data,
            width,
            height,
            mime_type,
        },
        seq_end,
    ))
}

fn try_parse_sixel(data: &[u8]) -> Option<(InlineImage, usize)> {
    // Sixel: ESC P ... ESC \
    if data.len() < 4 {
        return None;
    }
    if !(data[0] == 0x1b && data[1] == b'P') {
        return None;
    }

    // Find terminator: ESC \
    let mut end_pos = None;
    for j in 2..data.len() {
        if data[j] == 0x1b && j + 1 < data.len() && data[j + 1] == b'\\' {
            end_pos = Some((j, j + 2));
            break;
        }
    }
    let (payload_end, seq_end) = end_pos?;

    let sixel_data = data[2..payload_end].to_vec();

    Some((
        InlineImage {
            protocol: ImageProtocol::Sixel,
            data: sixel_data,
            width: None,
            height: None,
            mime_type: Some("image/sixel".to_string()),
        },
        seq_end,
    ))
}

fn detect_mime(data: &[u8]) -> Option<String> {
    if data.len() < 4 {
        return None;
    }
    // PNG
    if data.starts_with(&[0x89, 0x50, 0x4e, 0x47]) {
        return Some("image/png".to_string());
    }
    // JPEG
    if data.starts_with(&[0xff, 0xd8, 0xff]) {
        return Some("image/jpeg".to_string());
    }
    // GIF
    if data.starts_with(b"GIF8") {
        return Some("image/gif".to_string());
    }
    // WebP
    if data.len() >= 12 && &data[0..4] == b"RIFF" && &data[8..12] == b"WEBP" {
        return Some("image/webp".to_string());
    }
    None
}

/// Simple base64 decoder (no padding required)
fn base64_decode(input: &str) -> Option<Vec<u8>> {
    let input = input.trim();
    if input.is_empty() {
        return None;
    }

    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    let mut output = Vec::with_capacity(input.len() * 3 / 4);
    let mut buf: u32 = 0;
    let mut bits: u32 = 0;

    for &byte in input.as_bytes() {
        if byte == b'=' || byte == b'\n' || byte == b'\r' || byte == b' ' {
            continue;
        }
        let val = TABLE.iter().position(|&c| c == byte)? as u32;
        buf = (buf << 6) | val;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            output.push((buf >> bits) as u8);
            buf &= (1 << bits) - 1;
        }
    }

    Some(output)
}
