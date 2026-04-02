/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          0: "#0d0d0f",
          1: "#141418",
          2: "#1a1a20",
          3: "#222229",
        },
        border: {
          DEFAULT: "#2a2a33",
          active: "#4a4a55",
        },
        accent: {
          DEFAULT: "#d97757",
          hover: "#e08a6d",
          muted: "#d9775720",
        },
        text: {
          primary: "#e4e4e8",
          secondary: "#8e8e96",
          muted: "#5c5c66",
        },
      },
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "SF Mono",
          "Menlo",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
