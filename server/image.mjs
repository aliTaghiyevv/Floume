import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import bouquet from "../src/bouquet-data.json" with { type: "json" };

const project = resolve(fileURLToPath(new URL("../", import.meta.url)));
const images = resolve(project, ".imagegen/generated");
const binary = resolve(project, ".venv-image/bin/mflux-generate-flux2-edit");
const model = "flux2-klein-4b";
let running = false;

function json(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}

function promptFor(body) {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    !Array.isArray(body.flowers) ||
    body.flowers.length < 1 ||
    body.flowers.length > 8
  ) {
    throw new Error("Select 1–8 flower varieties first.");
  }
  const seen = new Set();
  const selected = body.flowers.map((item) => {
    const flower = bouquet.flowers.find((f) => f.id === item?.id);
    if (
      !flower ||
      seen.has(flower.id) ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 30
    ) {
      throw new Error("Choose valid flower varieties and quantities.");
    }
    seen.add(flower.id);
    return `${item.quantity} ${flower.name} stems`;
  });
  const base = bouquet.bases.find((b) => b.id === body.base)?.name;
  const decor = Array.isArray(body.decors)
    ? body.decors
        .slice(0, 6)
        .map((id) => bouquet.decors.find((d) => d.id === id)?.name)
        .filter(Boolean)
    : [];
  return {
    text: `Photorealistic florist studio product photograph of one elegant hand-tied bouquet made with ${selected.join(", ")}. ${base ? `Displayed in ${base}.` : "Wrapped as a hand-tied bouquet."} ${decor.length ? `Finishing details: ${decor.join(", ")}.` : "Simple cream wrapping paper."} Show the full bouquet centered, clear flower heads and stems, soft natural light, neutral warm off-white background, premium flower shop photography, realistic botanical petals, no people, no text, no watermark, no additional flower varieties.`,
    references: body.flowers.map((item) =>
      resolve(
        project,
        "public",
        bouquet.flowers.find((f) => f.id === item.id).image.slice(1),
      ),
    ),
  };
}

function generate(path, prompt, seed) {
  running = true;
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      binary,
      [
        "--model",
        model,
        "--small-text-encoder",
        "--quantize",
        "4",
        "--low-ram",
        "--image-paths",
        ...prompt.references.slice(0, 4),
        "--width",
        "512",
        "--height",
        "512",
        "--steps",
        "4",
        "--seed",
        String(seed),
        "--prompt",
        prompt.text,
        "--output",
        path,
      ],
      {
        cwd: project,
        env: { ...process.env, HF_HOME: resolve(project, ".imagegen/hf") },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    const timeout = setTimeout(() => child.kill("SIGTERM"), 5 * 60_000);
    let details = "";
    for (const stream of [child.stdout, child.stderr])
      stream.on("data", (chunk) => {
        details = (details + chunk.toString()).slice(-2000);
      });
    child.on("error", (error) => {
      clearTimeout(timeout);
      running = false;
      rejectPromise(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      running = false;
      if (code === 0 && existsSync(path) && statSync(path).size > 1000)
        resolvePromise();
      else
        rejectPromise(
          new Error(details || `Image generator exited with code ${code}.`),
        );
    });
  });
}

export function createImageMiddleware() {
  return async (req, res, next) => {
    try {
      const pathname = new URL(req.url || "/", "http://localhost").pathname;
      if (!pathname.startsWith("/api/image/")) return next();
      if (pathname === "/api/image/status" && req.method === "GET") {
        return json(res, 200, {
          ready: existsSync(binary),
          generating: running,
          model,
          local: true,
        });
      }
      if (pathname === "/api/image/generate" && req.method === "POST") {
        if (!existsSync(binary))
          return json(res, 503, {
            error: "Local image generator is not installed. See README.md.",
          });
        if (running)
          return json(res, 409, {
            error: "Another image is being generated. Try again in a moment.",
          });
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host)
          return json(res, 403, {
            error: "Only same-origin requests are accepted.",
          });
        let raw = "";
        for await (const chunk of req) {
          raw += chunk;
          if (raw.length > 8192)
            return json(res, 413, { error: "Bouquet selection is too large." });
        }
        let prompt;
        let body;
        try {
          body = JSON.parse(raw);
          prompt = promptFor(body);
        } catch (error) {
          return json(res, 400, {
            error:
              error instanceof Error
                ? error.message
                : "Invalid bouquet selection.",
          });
        }
        mkdirSync(images, { recursive: true });
        const variant = body.variant ?? 0;
        if (!Number.isInteger(variant) || variant < 0 || variant > 100)
          return json(res, 400, { error: "Invalid preview variant." });
        const id = createHash("sha256")
          .update(JSON.stringify([prompt, variant]))
          .digest("hex")
          .slice(0, 32);
        const path = resolve(images, `${id}.png`);
        if (!path.startsWith(images + sep))
          return json(res, 400, { error: "Invalid image path." });
        const cached = existsSync(path) && statSync(path).size > 1000;
        if (!cached) {
          try {
            await generate(
              path,
              prompt,
              Number.parseInt(id.slice(0, 8), 16) % 2147483647,
            );
          } catch (error) {
            return json(res, 502, {
              error: `Local generation failed: ${error instanceof Error ? error.message.slice(-400) : "unknown error"}`,
            });
          }
        }
        return json(res, 200, {
          imageUrl: `/api/image/${id}.png`,
          model,
          cached,
        });
      }
      const match = pathname.match(/^\/api\/image\/([a-f0-9]{32})\.png$/);
      if (match && req.method === "GET") {
        const path = resolve(images, `${match[1]}.png`);
        if (!existsSync(path) || statSync(path).size <= 1000)
          return json(res, 404, { error: "Image not found." });
        res.writeHead(200, {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=31536000, immutable",
        });
        return createReadStream(path).pipe(res);
      }
      return json(res, 404, { error: "Image endpoint not found." });
    } catch (error) {
      return json(res, 500, {
        error: "Image service error. Please try again.",
      });
    }
  };
}

export function localImagePlugin() {
  return {
    name: "floume-local-image",
    configureServer(server) {
      server.middlewares.use(createImageMiddleware());
    },
  };
}
