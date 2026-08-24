import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#FAF9FE",
        brand: {
          50: "#f5f3ff",
          100: "#ede8fe",
          200: "#ddd3fd",
          300: "#c4b0fa",
          400: "#a685f5",
          500: "#8b5cf0",
          600: "#7440e0",
          700: "#5f2fc2",
          800: "#4d269c",
          900: "#3f2280",
        },
        accent: {
          100: "#ecfccb",
          200: "#d9f99d",
          300: "#bef264",
          400: "#a3e635",
          500: "#84cc16",
          600: "#65a30d",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
