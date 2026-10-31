# Mobile storefront reference
Observed 2026-10-31 with REA at 390 × 844, device scale 1, Chromium, empty storage.
Evidence: `ev_d1efb51a25b7cb311754b1508afd281418a88bce981f307ec2624e1407dfc4c6`.
Scenario launched the public homepage, waited 5 seconds, navigated to the Pink Bouquet product page and waited 3 seconds. All actions completed and owned Chrome process was terminated.

## Files
- reference/mobile-home.png and mobile-home.html
- reference/mobile-product.png and mobile-product.html
The HTML files preserve observed source classes for exact implementation lookup.

## Homepage
- Sticky white 60px header, subtle bottom border. Header grid: auto / 1fr / auto; 12px gap.
- Logo is flower icon only, source /images/logo-icon.svg, 32×32, inside 44px touch target.
- Search input uses grey background, height44, border radius8, font16; account is a 44px icon-only button.
- Stores navigation appears below header on homepage (starts at y78 in screenshot): pale grey pill, shop icon and “Stores”, thin divider at right. This rail is absent on the product page.
- Main has margin-top16. Container padding approximately12px at 390 viewport.
- Promotional banner starts x12 y150, fills 366px content width, aspect16/9, rounded corners. Mobile carousel shows one banner at a time (desktop uses half-width). Under it, two centered pagination indicators, active pink32px bar and grey16px bar, height4.
- Flowers heading font20, semibold. Seen at y414. Category strip has large horizontal overflow with only 2.5 cards visible.
- Category item outer basis min154px incl 16px left padding; actual tile 138×104 (aspect16/12), radius16, grey background, p16. Text is top-left 12ish pixels, image absolutely covers tile.
- Category carousel arrows hidden on mobile.
- Bestsellers heading font18, medium, y585. Its View all products button is hidden in this mobile render.
- Product grid: two columns, gap12; at 390px content width each card ~177px. Cards radius12, thin grey border and very light shadow. Square image, object-cover, heart in a white circular button top-right. Lower content uses price then name (font14 medium, two-line clamp), optional rating.
- Main category section spacing uses mb48, product subsection mb32, header/category spacing as source DOM.
- Footer is hidden on mobile by default, with a separate Contact and other links control.

## Shared floating mobile dock
- Parent fixed bottom12 left50%, transform translateX(-50%), z10; lg:hidden breakpoint at1024.
- Two pill groups separated8px:
  1. Home / Categories / Cart
  2. Customize / AI
- Each group padding8, gap8, border1, rounded-full, background translucent and backdrop-blur-xl.
- First group border white40%, white20% background. Second border pink50040%, pink50020% background.
- Each icon button 48×48, white background, border, radius50%; 24px Tabler icons. Cart button may be slightly wider via horizontal18px padding.
- Group outer height66px. At 390px screenshot first group spans x36–224, second x232–354. Text is screen-reader-only, not rendered below icons.

## Product page
- Same sticky60px header; Stores rail absent.
- Main class mb24, mt0 on mobile, mt32 at md.
- Product section grid one column, gap24; md switches to two equal columns and gap32.
- Main image gallery radius24, overflow clipped, grey background. Slide aspect-square, object-cover, no thumbnails for this one-image product.
- Gallery overlays top-right white circular wishlist/share buttons with black24px icons.
- Purchase form flex-column gap24.
- Stock pill red text with pale pink background; text “2 left in stock”, small red circle.
- Product heading serif (font-hero), 20px medium, leading-tight. 24px at md.
- Product title/rating grouping uses vertical gap12; title sub-group spacing6.
- Rating row grey stars and blue “0 ratings” link.
- Price red, approximately24px. Quantity stepper same row at right: capsule border, minus / circular filled quantity / plus.
- Primary Add to cart full width, pink, white icon/text, height~50, pill radius. Buy now appears below as an outlined secondary full-width pill.
- Details below purchase: Size, Width—0.4, Height—0.6, Store House of flowers link, category chips. Product ratings/reviews section, similar products and other products from store follow.
- Related product grids use two columns/gap12; section margin-top48 (56 at md).
- The floating mobile dock overlaps lower purchase content at the original viewport, matching observed live behavior.

## Breakpoints from source classes
- sm: grid switches from2 to3 columns (640px conventional Tailwind breakpoint; verify source CSS)
- md: product page two columns; typography grows; category min-width200; cards radius16 (768px conventional)
- lg: desktop header/footer/dock behavior and four-column product grid (1024px conventional)
- Product grids stay four columns at xl.
Exact breakpoint values should be confirmed from desktop CSS rather than assumed from class names.

## Limitations
This is viewport evidence, not full-page screenshots. Capture does not inspect authenticated AI, real checkout, or responsive sizes between the declared viewport and desktop. Lazy-loading can leave offscreen image nodes absent until scrolled.

