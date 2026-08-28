/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#0A1C5C',
        secondary: '#4f46e5', // indigo-600
        'status-success': '#48bb78',
        'status-warning': '#f59e0b', // amber-500
        'status-error': '#f43f5e', // rose-500
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "Inter", "ui-sans-serif", "system-ui"],
        display: ['"Playfair Display"', "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
