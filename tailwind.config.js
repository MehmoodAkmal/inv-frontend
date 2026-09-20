/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        // ── Brand — Slate (sidebar, neutrals, text hierarchy) ─────────────
        brand: {
          950: "#020617",   // near-black
          900: "#0f172a",   // sidebar background
          800: "#1e293b",   // sidebar hover / active bg
          700: "#334155",   // section dividers, sub-labels
          600: "#475569",   // muted text
          500: "#64748b",   // placeholder / sub-text
          400: "#94a3b8",   // light muted
          300: "#cbd5e1",   // borders on light bg
          200: "#e2e8f0",   // card borders
          100: "#f1f5f9",   // table header bg
          50:  "#f8fafc",   // page section bg
          accent: "#34d399", // emerald-400 — active nav highlight
        },

        // ── Primary — Emerald (buttons, active links, badges) ─────────────
        primary: {
          950: "#022c22",
          900: "#064e3b",
          800: "#065f46",
          700: "#047857",
          600: "#059669",   // primary button bg
          500: "#10b981",   // hover state
          400: "#34d399",   // active accent / focus ring
          300: "#6ee7b7",
          200: "#a7f3d0",
          100: "#d1fae5",
          50:  "#ecfdf5",
          accent: "#34d399",
          DEFAULT: "#059669",
        },

        // ── Success ───────────────────────────────────────────────────────
        success: {
          50:  "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          DEFAULT: "#16a34a",
        },

        // ── Warning ───────────────────────────────────────────────────────
        warning: {
          50:  "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          DEFAULT: "#f59e0b",
        },

        // ── Danger ────────────────────────────────────────────────────────
        danger: {
          50:  "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
          DEFAULT: "#ef4444",
        },

        // ── Neutral ───────────────────────────────────────────────────────
        neutral: {
          50:  "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#111827",
          950: "#030712",
          DEFAULT: "#6b7280",
        },

        // ── Dark mode surfaces ────────────────────────────────────────────
        dark: {
          900: "#020617",
          800: "#0f172a",
          700: "#1e293b",
          600: "#334155",
          400: "#94a3b8",
        },
      },

      borderRadius: {
        card: "8px",
        xl:   "0.75rem",
        "2xl":"1rem",
      },

      boxShadow: {
        card:      "0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.04)",
        "card-md": "0 4px 6px -1px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.04)",
        "card-lg": "0 10px 15px -3px rgb(15 23 42 / 0.10), 0 4px 6px -4px rgb(15 23 42 / 0.06)",
        "dark-card": "0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.2)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
