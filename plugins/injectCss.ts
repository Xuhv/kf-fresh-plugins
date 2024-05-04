import type { Plugin } from "$fresh/server.ts"
import { DOMParser, type Element } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts"
import type { PluginRenderLink } from "$fresh/src/server/types.ts"

/**
 * Set `data-stylesheet` attribute to your component.
 * @param resolve attribute `data-stylesheet` => css file url
 * @returns
 */
export function injectCSS(resolve = (v: string) => v): Plugin {
  return {
    name: "inject-css",
    render: ctx => {
      const res = ctx.render()
      const document = new DOMParser().parseFromString(res.htmlText, "text/html")
      const elementsWithStyleTag = document?.querySelectorAll("[data-stylesheet]")
      const sheetsToImport: Array<string> = []
      elementsWithStyleTag?.forEach($el => {
        const el = $el as unknown as Element
        // biome-ignore lint/style/noNonNullAssertion: <explanation>
        const styleSheet = el.getAttribute("data-stylesheet")!
        if (styleSheet && !sheetsToImport.includes(styleSheet)) {
          sheetsToImport.push(styleSheet)
        }
      })
      const links: Array<PluginRenderLink> = []
      sheetsToImport.forEach(sheet => {
        links.push({ href: resolve(sheet), rel: "stylesheet" })
      })
      return { scripts: [], links: links }
    }
  }
}
