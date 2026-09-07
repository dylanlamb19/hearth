/** @type {import("tailwindcss").Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#fdfcf9",
          100: "#f9f7f2",
          200: "#f3efe6",
          300: "#e8e1d4",
        },
        ember: {
          50: "#fef7f0",
          100: "#fdecd9",
          200: "#fad5b0",
          300: "#f5b478",
          400: "#ef8f40",
          500: "#e8731a",
          600: "#d95a10",
          700: "#b44310",
          800: "#903615",
          900: "#742f14",
        },
        ink: {
          50: "#f6f6f5",
          100: "#e7e7e5",
          200: "#d1d1cd",
          300: "#b0b0a9",
          400: "#888880",
          500: "#6d6d65",
          600: "#575751",
          700: "#474742",
          800: "#3d3d39",
          900: "#1a1a18",
          950: "#111110",
        },
        hearth: {
          DEFAULT: "#3d4451",
          dark: "#2c323d",
          soft: "#5a6270",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: { "4xl": "2rem" },
      boxShadow: {
        soft: "0 2px 16px rgba(26, 26, 24, 0.06)",
        card: "0 1px 3px rgba(26, 26, 24, 0.04), 0 4px 20px rgba(26, 26, 24, 0.04)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
