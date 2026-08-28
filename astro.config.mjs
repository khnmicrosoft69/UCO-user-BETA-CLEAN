import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      // Forces Vite to correctly look up the ESM exports for React 19
      include: ['react', 'react-dom', 'react-dom/client'], 
    },
  },
});