# Authenticated bouquet flow observations

Observed in the user-signed-in Floume browser session on October 31, 2026. Screenshots and selected public DOM details are in `reference/`. This documents visible behavior, not the original implementation or private API.

## AI chat

The **AI** entry opens a centered 576px dialog on desktop and a full-height panel on mobile. It has an online status, welcome message, four starter prompts, and a text composer. A birthday prompt returned product cards with image, florist, price, and add-to-cart action. A request for a custom bouquet outside observed stock produced a text refusal. No AI image-generation flow was observed.

The local recreation uses Ollama and the already installed `qwen2.5-coder:7b` model. The API receives recent messages, selects local snapshot products and flower options, requests structured output from the model, and verifies returned IDs, flower counts, and budget. Product suggestions and custom flower designs are distinct modes. Chat history is stored locally in the browser. This model and its wording are not claimed to match Floume's own AI.

## Manual builder

**Customize** opens five steps: **Design your own bouquet**, **Choose a store**, **Choose a base**, **Decor & ribbons**, and **Complete your order**. The flower step has category filters, flower chips, a dotted placement canvas, and count controls. The store step showed Aes Flowers for the sampled composition. Base and decorations are optional. The review step shows composition and fees, delivery or pickup, date, promo and note controls, and a payment action in the live service.

The local builder uses 50 flower styles, 9 bases, 16 wrappers, and 3 ribbons collected from public media references. It retains drafts in local storage and saves completed bouquets to the local cart. A local **Save bouquet** action replaces payment and order submission. An optional local FLUX.2 Klein 4B model now renders a photorealistic concept from selected flowers, with local flower photos as references. This is an approximate visualization: in testing, the model changed Alstroemeria petal shapes and flower counts. The selected item list remains the exact order draft. The browser screenshots in `reference/` document desktop and mobile layouts. Only the white and pink Alstroemeria stem prices were directly observed; other flower prices are preview estimates. The captured catalog and availability do not update from Floume.

## Completion boundary

The recreation does not include live identity, addresses, payments, orders, merchant stock administration, or delivery dispatch. Those need an application backend and external business integrations before this can operate as a commerce service.
