/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "Inter", "ui-sans-serif", "system-ui"],
        display: ['"Playfair Display"', "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
