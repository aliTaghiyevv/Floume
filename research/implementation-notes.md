# Storefront recreation

Implemented from the public desktop and mobile references captured on 2026-10-31. The homepage/product routes are a local React implementation, not reused executable application bundles.

## Observed design

- Inter body text and Playfair Display product titles.
- 1180px desktop container with 12px side padding; 73px desktop header and 61px mobile header including border.
- Two desktop banners; one swipeable banner with pagination on mobile.
- Category artwork uses its native transparent image canvas, with cropped overflow matching the reference.
- Four product columns on desktop, three at intermediate widths, and two on phones.
- Desktop product gallery/detail columns; stacked mobile product details and 366px square gallery at a 390px viewport.
- Mobile floating navigation with 48px circular controls and 12px bottom inset. The public reference hides the footer below the desktop breakpoint.

## Coverage

- Homepage: implemented, including all 10 captured catalog sections.
- Product pages: implemented for all 66 snapshot products. The sampled Pink Bouquet's exact similar/store product sequences are retained. Other pages derive related lists from the local catalog rather than querying the original API.
- Responsive layouts: checked at 1440, 768, 390, and 320 pixels.
- Local interactions: search, categories, store listings, sorting, image galleries/zoom, wishlist, quantity controls, and persistent cart.
- Authenticated AI/customization and real checkout: outside this design implementation; dialogs explain preview availability.

The visual reference includes public third-party branding, photography, fonts, and SVG paths. Source URLs are recorded in `reference/asset-manifest.json`. The local catalog is a point-in-time snapshot; prices/availability do not refresh from the original service.

## Verification

Production build and TypeScript checks pass. Final browser run: 9 passed, 1 expected desktop skip for the mobile-only test. Tests cover desktop/mobile navigation, image and asset loading, overflow, search, wishlist, quantity changes, cart persistence, sign-in dialog dismissal, and mobile dock navigation. Additional homepage, perfume, and toy-page checks at 320px and 768px found no page overflow, broken visible images, or browser errors. All catalog asset references resolve to local files. Screenshots are written to `research/implementation/` by the visual-check script and to `test-results/` by the browser tests.
