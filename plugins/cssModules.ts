import { type CSSModuleExports, Features, transform } from "npm:lightningcss@1.24.1"
import type { Plugin, PluginMiddleware } from "$fresh/server.ts"
import { mightFail } from "@might/fail"

async function parseStyles(url: string): Promise<{ code: Uint8Array; exports: void | CSSModuleExports }> {
  const { code, exports } = await Deno.readFile(url).then(x =>
    transform({
      filename: url,
      cssModules: true,
      code: x,
      include: Features.Nesting
    })
  )

  return { code, exports }
}

function mergeUint8Arrays(arr: Uint8Array[]): Uint8Array {
  const totalSize = arr.reduce((acc, e) => acc + e.length, 0)
  const merged = new Uint8Array(totalSize)

  arr.forEach((array, i, arrays) => {
    const offset = arrays.slice(0, i).reduce((acc, e) => acc + e.length, 0)
    merged.set(array, offset)
  })

  return merged
}

function mod(base: string, p: string): [name: string, parent: string] {
  const parts = p.split("/")
  // biome-ignore lint/style/noNonNullAssertion: <explanation>
  const n = parts.pop()!.replace(/\.module\.css$/, "")
  const parent = parts.slice(base.split("/").length).join("/")
  return [n, parent]
}

async function ensureDir(dir: string) {
  const { error } = await mightFail(Deno.readDir(dir)[Symbol.asyncIterator]().next())
  if (error) await Deno.mkdir(dir, { recursive: true })
}

async function produce(watchDir: string, url: string, tsOutDir: string, cssOutDir?: string) {
  const { exports: _exports, code } = await parseStyles(url)
  // biome-ignore lint/style/noNonNullAssertion: <explanation>
  const exports = Object.fromEntries(Object.entries(_exports!).map(([k, v]) => [k, v.name]))
  const [n, parent] = mod(watchDir, url)

  await ensureDir(joinPath(tsOutDir, parent))
  await Deno.writeTextFile(joinPath(tsOutDir, parent, `${n}.styles.ts`), `export default ${JSON.stringify(exports)}`)

  if (cssOutDir) {
    await ensureDir(joinPath(cssOutDir, parent))
    await Deno.writeFile(joinPath(cssOutDir, parent, `${n}.css`), code)
  }
}

function joinPath(...parts: string[]) {
  return parts.join("/")
}

let watcher: Deno.FsWatcher | null = null

type CssModulesPluginOptions = {
  watchDir: string
  /**
   * where `[name].styles.ts` will be generated
   */
  tsOutDir: string
  /**
   * where `[name].css` will be generated. recommended to use it with injectCss plugin.
   */
  cssOutDir?: string
  /**
   * bundle all css modules into one file
   */
  cssOutFile?: string
}

type CssModulesPlugin = Plugin & { produceModules: () => Promise<void> }

/**
 * watch all [name].module.css files
 */
export function cssModules({ tsOutDir, watchDir, cssOutFile, cssOutDir }: CssModulesPluginOptions): CssModulesPlugin {
  if (!cssOutFile === !cssOutDir) throw new Error("cssOutFile and cssOutDir can't be undefined or not undefined at the same time")

  const list = Array.from(Deno.readDirSync(watchDir))
    .filter(x => x.isFile && x.name.endsWith(".css"))
    .map(x => joinPath(watchDir, x.name))

  async function produceStylesheetResponse() {
    const code = await Promise.all(list.map(parseStyles))
      .then(x => x.map(y => y.code))
      .then(mergeUint8Arrays)

    return new Response(code, {
      headers: {
        "Content-Type": "text/css",
        "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate"
      }
    })
  }

  async function produceStylesheet(cssOutFile: string) {
    await Promise.all(list.map(parseStyles))
      .then(x => x.map(y => y.code))
      .then(mergeUint8Arrays)
      .then(x => Deno.writeFile(cssOutFile, x))
  }

  async function produceModules() {
    if (cssOutFile) await produceStylesheet(cssOutFile)
    for (const url of list) await produce(watchDir, url, tsOutDir, cssOutDir)
  }

  const cssModulesMiddleware: PluginMiddleware = {
    path: "/",
    middleware: {
      handler: async (_req, ctx) => {
        const pathname = ctx.url.pathname

        const cssOutFileName = cssOutFile?.split("/").pop()
        if (!cssOutFileName || !pathname.endsWith(cssOutFileName)) return ctx.next()

        return await produceStylesheetResponse()
      }
    }
  }

  const plugin: CssModulesPlugin = {
    name: "cssModules",
    middlewares: [cssModulesMiddleware],
    async buildStart() {
      watcher?.close()
      await produceModules()
    },
    produceModules
  }

  async function startWatch(watchDir: string, tsOutDir: string, cssOutDir?: string): Promise<void> {
    watcher?.close()
    watcher = Deno.watchFs(watchDir)

    for await (const event of watcher) {
      const p = event.paths[0]
      if (!p.endsWith(".module.css")) continue

      if (event.kind === "create" || event.kind === "modify") {
        await produce(watchDir, p, tsOutDir, cssOutDir)
      } else if (event.kind === "remove") {
        const [n, parent] = mod(watchDir, p)
        await mightFail(Deno.remove(joinPath(tsOutDir, parent, `${n}.styles.ts`)))
        if (cssOutDir) await mightFail(Deno.remove(joinPath(cssOutDir, parent, `${n}.css`)))
      }
    }
  }

  startWatch(watchDir, tsOutDir, cssOutDir)

  return plugin
}
