import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Malgun Gothic",
          "Apple SD Gothic Neo",
          "sans-serif",
        ],
      },
      maxWidth: {
        content: "900px",
      },
      colors: {
        border: {
          DEFAULT: "hsl(var(--border))",
          // legacy alias from the Phase-1 ops screens (sources/logs) kept for compat
          strong: "hsl(var(--input))",
        },
        input: "hsl(var(--input))",
        // legacy aliases below: kept so the real, DB-backed ops screens
        // (admin/sources, admin/logs, briefing) inherited from the Phase-1
        // build keep working without a full visual rewrite.
        bg: {
          DEFAULT: "hsl(var(--background))",
          subtle: "hsl(var(--muted))",
        },
        navy: {
          900: "#55760A",
          700: "#3D5A16",
        },
        blue: {
          600: "#528B18",
          500: "#6BB125",
        },
        danger: "hsl(var(--destructive))",
        warning: "hsl(var(--accent))",
        text: {
          DEFAULT: "hsl(var(--foreground))",
          muted: "hsl(var(--muted-foreground))",
          subtle: "hsl(var(--muted-foreground))",
        },
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        "cat-1": "hsl(var(--cat-1))",
        "cat-2": "hsl(var(--cat-2))",
        "cat-3": "hsl(var(--cat-3))",
        "cat-4": "hsl(var(--cat-4))",
        "cat-5": "hsl(var(--cat-5))",
        "cat-6": "hsl(var(--cat-6))",
        "cat-7": "hsl(var(--cat-7))",
        "cat-8": "hsl(var(--cat-8))",
        "cat-9": "hsl(var(--cat-9))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        xl: "calc(var(--radius) + 4px)",
        note: "12px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15,23,42,0.04), 0 1px 1px rgba(15,23,42,0.03)",
        card: "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
        "card-hover": "0 12px 32px rgba(15,23,42,0.10), 0 4px 10px rgba(15,23,42,0.05)",
        popover: "0 16px 40px rgba(15,23,42,0.16)",
        // Notion-style layered tooltip shadow — one tight contact shadow
        // plus one soft ambient one, instead of a single hard drop shadow.
        note: "0 2px 6px rgba(15,23,42,0.08), 0 8px 24px rgba(15,23,42,0.10)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-468px 0" },
          "100%": { backgroundPosition: "468px 0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 1.6s linear infinite",
        "fade-in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
