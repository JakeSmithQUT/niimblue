import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [svelte(), tailwindcss()],
  root: ".",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      $lib: resolve(__dirname, "./src/renderer/lib"),
      $: resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["@mmote/niimbluelib"],
  },
});
