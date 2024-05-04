import type { JSX } from "preact";
import { IS_BROWSER } from "$fresh/runtime.ts";
import styles from "./Button.styles.ts";

export function Button(props: JSX.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={!IS_BROWSER || props.disabled}
      class={`${styles.Button} transition-colors`}
      data-stylesheet="/Button.css"
    />
  );
}
