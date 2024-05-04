import { defineConfig } from "$fresh/server.ts"
import tailwind from "$fresh/plugins/tailwind.ts"
import { cssModules } from "./plugins/cssModules.ts"
import { injectCSS } from "./plugins/injectCss.ts";
import { resolve } from "$std/path/mod.ts";

export default defineConfig({
  plugins: [
    cssModules({
      watchDir: resolve("./components"),
      tsOutDir: resolve("./components"),
      // cssOutFile: resolve("./static/bundle.css")
      cssOutDir: resolve("./static"),
    }),
    injectCSS(),
    tailwind()
  ]
})
