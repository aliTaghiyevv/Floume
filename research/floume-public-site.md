# Floume public-site investigation
Date: 2026-10-31
Target: https://floume.ai/en/
Scope: unauthenticated desktop homepage, AI and Customize entry points, and one product page. This is an initial public-site map, not a complete reconstruction.

## REA connection
Live MCP server rea-agents 6.8.0, client codex-mcp-client. Server alignment: aligned. Catalog: 229 MCP tools. Browser scenario captures succeeded and their temporary Chromium processes were terminated.

## Evidence
- E1: ev_75e46495a3fe3bd962f34d3c883f074a903888fbf66a63f527f530dcea8ef027 — homepage DOM, accessibility and network capture after a five-second wait.
- E2: ev_b1059bccf738de1661158267284edf993a54f853a82645839be3490c104728d1 — AI entry, Customize entry, and Pink Bouquet product page.
- Machine-readable observations: evidence-summary.json. Evidence IDs identify original REA results; the summary does not contain all raw response bodies.

## Observed structure
The homepage has a shared navigation shell, categories menu, product/store search, cart, account, stores entry, promotional banners, category carousels and product grids. Captured sections include Flowers, Plush & Balloons and Perfumes. Cards expose prices in AZN, wishlist controls and some ratings. Footer includes legal/help pages and payment-brand imagery. Brand imagery does not establish working payment integrations. (E1)

Product route: /en/products/b99d12e1-4d70-4728-b7fc-10b4a818320b.
The sampled page exposes gallery, stock count, quantity controls, Add to cart, Buy now, dimensions, store link, reviews, similar products and other products from the store. Related-product lists populated after initial load. No purchase or cart mutation was performed. (E2)

AI and Customize each opened a Sign in dialog in an empty browser profile. Dialog offers a phone-number field defaulting to Azerbaijan +994, Continue, and Sign in with Telegram. This proves the anonymous entry behavior; successful sign-in and the underlying AI/customization behavior remain unobserved. (E2)

## Observed delivery and API surface
- Frontend assets are delivered from /assets/ with hashed JavaScript/CSS names and modulepreload entries.
- DOM uses utility classes and data-slot component markers, with Tabler icon class names and Sonner toast styling. This is consistent with a utility-CSS/component frontend; exact framework versions and original source structure are unverified.
- Catalog images are fetched from floume-production S3 URLs.
- Tawk.to chat and Cloudflare browser telemetry scripts were requested.
- API requests use https://api.floume.ai. Observed GET paths include:
  - /profile/me
  - /marketplace/categories?isTitle=true&page=1&limit=50
  - /marketplace/categories?parentId=<id>&page=1&limit=12&type=SYSTEM
  - /marketplace/products?categoryId=<id>&page=1&limit=8
  - /marketplace/products?limit=8&page=1&organizationId=<store-id>
  - /marketplace/reviews/products/<product-id>?page=1&limit=6
  - /marketplace/banners/<banner-id>
These are observed client requests, not a complete backend contract. Initiator stacks were not captured. (E1, E2)

## Findings and confidence
Observed: localized /en routes, UUID-based product/category/store references, paginated catalog requests, separate API origin, S3 media, sign-in gating for AI/customization.
Inferred: a reconstruction can separate storefront shell, catalog, product details, identity, cart/checkout, and AI/customization modules.
Unknown: backend source/framework, database schema, authentication implementation, payment processor, AI models/prompts/generation pipeline, merchant workflows, and successful checkout behavior.

Some English-page controls retained Azerbaijani text, including wishlist labels and product categories. Several footer links use # placeholders. These are bounded observations, not a full localization or link audit.

## Coverage and next steps
Connection: verified.
Homepage and one product page: mapped.
AI and Customize entry behavior: verified; authenticated functionality unresolved.
Search, stores, category filters, cart persistence, checkout, mobile layout and authenticated account flows: not yet tested.
For faithful reconstruction, continue with the desired scope (visual storefront, complete shopping flow, or AI/custom bouquet builder), then inspect authenticated flows in a user-controlled session as needed.

## Capture limitations
E1 retained the page DOM and accessibility, but reports incomplete events because some selected response bodies were unavailable or exceeded its per-body budget. E2 reports complete capture for its declared scenario; it does not establish coverage of the entire application. Neither capture recovers server source or proves server-side internals. Browser defaults were 1280x720, en-US, UTC, reduced motion, empty storage and blocked service workers.

