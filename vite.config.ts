import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
// Public folder assets (404.html, _redirects) are merged into the
// single-file HTML build by viteSingleFile, so Railway / Netlify /
// Cloudflare Pages all serve the SPA fallback automatically.
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile({ useRecommendedBuildConfig: true })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 2000,
  },
});
