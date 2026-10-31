# Floume storefront recreation

A local React + TypeScript recreation of [Floume](https://floume.ai/en/), based on browser observations from October 31, 2026. It includes the storefront, an AI bouquet assistant powered by a model on your Mac, and a five-step bouquet builder.

## Run locally

Open the Ollama Mac app and pull a model if needed: `ollama pull qwen2.5-coder:7b`. This Mac already has Ollama and this model. No API key or paid AI provider is needed. To change chat models, set `OLLAMA_MODEL` in `.env.local` (see `.env.example`). Then run:

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:5173/en/`. Click **AI** for local chat or **Customize** for the manual builder. The AI can recommend captured products and send a flower design into the builder.

```sh
npm run build     # Type-check and build dist/
npm start         # Serve built frontend and AI API on port 4173
npm run check     # Type-check
npm run test:server
npx playwright test
```

The browser tests use the installed macOS Chrome executable. Update `playwright.config.ts` for another environment.

## Included

- Responsive homepage with promotional banners, swipeable category carousels, all 10 captured catalog sections, and product grids.
- Product pages for all 66 captured products, including local images, image zoom, galleries where available, stock, quantity controls, store information, and related products.
- AI chat using local Ollama inference, with checked catalog recommendations and bouquet designs.
- Five-step bouquet builder covering flowers, florist, base, decor/ribbons, and delivery or pickup review.
- Optional photorealistic bouquet previews generated on this Mac with FLUX.2 Klein 4B via MFLUX. The first run downloads model weights; later generations reuse the local cache. Preview images are saved locally and shown in the builder and cart.
- Desktop header and mobile floating navigation.
- Category/store listings, search, price sorting, wishlist toggles, and a cart saved in local storage.
- Sign-in and category dialogs with keyboard dismissal and focus containment.

Catalog data, branding, banners, product images, and font files are stored locally. The site makes no requests to Floume's API during normal use. With public Supabase environment variables configured, phone OTP and the configured `custom:telegram` OIDC provider use Supabase Auth; without them the account form reports that accounts are unavailable. Telegram accounts are never joined in the browser: a trusted server workflow must require a verified phone claim and perform any identity join. The cart, wishlist, chat history, builder draft, and saved bouquets still persist only in this browser. Saving a bouquet adds it to the local cart; it does not charge a card or place an order. The loose-stem prices other than two observed examples are preview estimates, and snapshot stock is not live. The Supabase migrations are a foundation, not an active checkout or florist backend. Generated images are visual concepts: the model can change flower shapes, counts, and wrapping, so the selected item list remains authoritative. Editorial/legal pages link to the original site for full content.

Image generation uses an isolated `.venv-image/` Python environment and the `mflux` package. On a new Mac, install it with `uv venv --python 3.13 .venv-image` and `uv pip install --python .venv-image/bin/python mflux`. Model weights download to `.imagegen/hf/` when a preview is first generated. This 16 GB Mac has the runtime and weights installed; a local 512px sample peaked at about 8.5 GB MLX memory. Image generation needs macOS Metal access. The images and model cache stay on this Mac; no image-generation API key or paid service is used. [MFLUX](https://github.com/mflux-community/mflux) and [FLUX.2 Klein 4B](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B) are the upstream projects.

For a production-style local run, use `npm run build` then `npm start`. The Node server serves the built frontend and `/api/ai/*` on `http://127.0.0.1:4173`. Serving `dist/` alone shows the storefront, but AI requires the Node API. The API connects only to loopback Ollama.

## Project layout

- `src/App.tsx`: routes, storefront components, and local shopping interactions.
- `src/styles.css`: responsive styles.
- `src/catalog.json`: captured catalog and asset references.
- `src/components/icons.tsx`: SVG paths observed in the public reference.
- `src/components/BouquetAssistant.tsx`: AI chat interface.
- `src/components/BouquetCustomizer.tsx`: manual builder.
- `server/`: local AI API and production server.
- `public/assets/`: local media and fonts.
- `research/`: investigation notes, source observations, and visual references.
- `tests/storefront.spec.ts`: desktop/mobile browser checks.
- `tests/bouquet.spec.ts`: AI and builder browser checks.

`scripts/visual-check.mjs` writes screenshots and measurements for desktop, mobile, tablet, and 320px layouts. `scripts/collect-reference.py` is the optional read-only collection utility used to create the snapshot; it requires Python's Beautiful Soup package and network access. It is not needed to build or run the app.

When hosting `dist/`, configure an SPA fallback to `index.html` so direct product-page links work.
