import type { Config } from "tailwindcss";

// 디자인 토큰 출처: docs/PROJECT_SPEC.md §12.2
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: "#FFFFFF", subtle: "#F7F9FC", ai: "#F4F7FD" },
        border: { DEFAULT: "#E3E8EF", strong: "#CDD5DF" },
        navy: { 900: "#0B1F3A", 700: "#14315C", 500: "#1E4B8F" },
        blue: { 600: "#2563EB", 500: "#3B82F6", 100: "#DBEAFE" },
        text: {
          DEFAULT: "#0B1F3A",
          muted: "#5B6B84",
          subtle: "#8A97AB",
          read: "#A3ADBD",
        },
        danger: "#DC2626",
        warning: "#D97706",
        success: "#059669",
        neutral: "#6B7280",
        impact: {
          1: "#CDD5DF",
          2: "#93B4E8",
          3: "#3B82F6",
          4: "#1E4B8F",
          5: "#0B1F3A",
        },
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "8px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(11,31,58,.06)",
        md: "0 2px 8px rgba(11,31,58,.08)",
      },
      maxWidth: {
        layout: "1440px",
      },
    },
  },
  plugins: [],
};

export default config;
