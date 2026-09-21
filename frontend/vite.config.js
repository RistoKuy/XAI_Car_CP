import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
  build: {
    // Dua entry terpisah: User Portal (index.html) dan
    // Developer Portal (developer.html) di port berbeda.
    rollupOptions: {
      input: {
        main: "index.html",
        developer: "developer.html",
      },
    },
  },
});
