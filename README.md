# @kf/fresh-plugins

Plugins for [fresh](https://fresh.deno.dev).

#### [cssModules](./plugins/cssModules.ts)

**NOTE:**
1. Currently, it can't scan directory recursively.
2. I have no idea to build modules when start dev server, so run `deno task build` before `deno task start`. 

It generate `[name].styles.ts` file from css modules file, so import classes
from it instead of the css file.

```ts
import type { JSX } from "preact";
import { IS_BROWSER } from "$fresh/runtime.ts";
import styles from "./Button.styles.ts";

export function Button(props: JSX.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={!IS_BROWSER || props.disabled}
      class={`${styles.Button} transition-colors`}
      data-stylesheet="/Button.css" // for injectCss plugin: specify a css file to inject
    />
  );
}
```

#### [injectCSS](./plugins/cssModules.ts)

```ts
// fresh.config.ts
import { defineConfig } from "$fresh/server.ts";
import tailwind from "$fresh/plugins/tailwind.ts";
import { cssModules } from "https://deno.land/x/kf_fresh_plugins/plugins/cssModules.ts";
import { injectCSS } from "https://deno.land/x/kf_fresh_plugins/plugins/injectCss.ts";
import { resolve } from "$std/path/mod.ts";

export default defineConfig({
  plugins: [
    cssModules({
      watchDir: resolve("./components"), // all path should be absolute
      tsOutDir: resolve("./components"),
      // cssOutFile: resolve("./static/bundle.css"), // if you need a bundled css file, use this
      cssOutDir: resolve("./static"), // if you need a separate css file, use this with injectCSS plugin
    }),
    injectCSS(),
    tailwind(),
  ],
});
```
