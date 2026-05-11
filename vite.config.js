import { defineConfig } from "vite";

export default defineConfig({
  root: "front",
  base: "./",
  server: {
    port: 5174,
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
