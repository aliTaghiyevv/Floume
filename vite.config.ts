import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// @ts-expect-error Local Node middleware is intentionally authored as ESM JavaScript.
import { localAiPlugin } from "./server/ai.mjs";
export default defineConfig({ plugins: [react(), localAiPlugin()] });
