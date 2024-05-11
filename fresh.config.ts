import { defineConfig } from "$fresh/server.ts"
import tailwind from "$fresh/plugins/tailwind.ts"
import { cssModules } from "./plugins/cssModules.ts"
import { injectCSS } from "./plugins/injectCss.ts";
import { resolve } from "$std/path/mod.ts";

const cssModulesPlugin = cssModules({
  watchDir: resolve("./components"),
  tsOutDir: resolve("./components"),
  cssOutDir: resolve("./static"),
})

if (Deno.args.includes("build")) await cssModulesPlugin.produceModules()

export default defineConfig({
  plugins: [
    cssModulesPlugin,
    injectCSS(),
    tailwind()
  ]
})
