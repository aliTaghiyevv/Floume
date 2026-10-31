# Floume storefront

A local React + TypeScript recreation of [floume.ai/en](https://floume.ai/en/), built from REA browser observations of the public storefront on October 31, 2026.

## Run locally

```sh
npm install
npm run dev
```

Open the URL printed by Vite. The homepage is at `/en/`; `/` also works. A reference product page is at `/en/products/b99d12e1-4d70-4728-b7fc-10b4a818320b`.

```sh
npm run build     # Type-check and build dist/
npm run preview   # Serve the production build
npm run check     # Type-check
npx playwright test
```

The browser tests use the installed macOS Chrome executable. Update `playwright.config.ts` for another environment.

## Included

- Responsive homepage with promotional banners, swipeable category carousels, all 10 captured catalog sections, and product grids.
- Product pages for all 66 captured products, including local images, image zoom, galleries where available, stock, quantity controls, store information, and related products.
- Desktop header and AI controls; mobile search and floating navigation.
- Category/store listings, search, price sorting, wishlist toggles, and a cart saved in local storage.
- Sign-in and category dialogs with keyboard dismissal and focus containment.

Catalog data, branding, banners, product images, and font files are stored locally. The running storefront makes no requests to Floume's API. Authentication, AI/custom bouquet generation, payments, and order submission are not connected. Local cart/wishlist behavior is implemented for this recreation. Editorial/legal pages link to the original site for their full content.

## Project layout

- `src/App.tsx`: routes, storefront components, and local shopping interactions.
- `src/styles.css`: responsive styles.
- `src/catalog.json`: captured catalog and asset references.
- `src/components/icons.tsx`: SVG paths observed in the public reference.
- `public/assets/`: local media and fonts.
- `research/`: investigation notes, source observations, and visual references.
- `tests/storefront.spec.ts`: desktop/mobile browser checks.

`scripts/visual-check.mjs` writes screenshots and measurements for desktop, mobile, tablet, and 320px layouts. `scripts/collect-reference.py` is the optional read-only collection utility used to create the snapshot; it requires Python's Beautiful Soup package and network access. It is not needed to build or run the app.

When hosting `dist/`, configure an SPA fallback to `index.html` so direct product-page links work.
