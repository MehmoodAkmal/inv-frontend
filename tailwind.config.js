/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // ── Teal-navy palette (from image) ─────────────────────────────
        brand: {
          950: "#001220",   // darkest navy
          900: "#001B29",   // deepest navy  — sidebar bg
          800: "#002D3E",   // dark teal-navy — sidebar sections/hover
          700: "#003D52",   // mid navy
          600: "#3D7A7A",   // muted teal    — primary brand / active
          500: "#4E9090",   // teal
          400: "#7DBFB2",   // soft teal     — accent / highlights
          300: "#A0CFC8",   // light teal
          200: "#C5D8D5",   // pale mint     — borders / subtle bg
          100: "#E0EEEC",   // very pale mint
          50:  "#F0F7F6",   // near white mint
        },
        // keep primary aliased to brand for btn-primary etc.
        primary: {
          50:  "#F0F7F6",
          100: "#E0EEEC",
          200: "#C5D8D5",
          300: "#A0CFC8",
          400: "#7DBFB2",
          500: "#4E9090",
          600: "#3D7A7A",
          700: "#2E6060",
          800: "#1E4747",
          900: "#0F2E2E",
        },
      },
      boxShadow: {
        card:      "0 1px 3px 0 rgb(0 27 41 / 0.08), 0 1px 2px -1px rgb(0 27 41 / 0.06)",
        "card-md": "0 4px 6px -1px rgb(0 27 41 / 0.10), 0 2px 4px -2px rgb(0 27 41 / 0.06)",
        "card-lg": "0 10px 15px -3px rgb(0 27 41 / 0.10), 0 4px 6px -4px rgb(0 27 41 / 0.05)",
      },
      borderRadius: {
        xl:   "0.75rem",
        "2xl":"1rem",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
