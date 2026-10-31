import { chromium } from '/opt/homebrew/lib/node_modules/rea-agents/node_modules/playwright-core/index.mjs';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('https://floume.ai/en/products/b99d12e1-4d70-4728-b7fc-10b4a818320b');
  await page.waitForTimeout(2500);
  console.log(JSON.stringify(await page.evaluate(() => {
    const selectors = ['header.lg\\:hidden', '[data-slot="page-content"]', '.container-narrow', 'main > div > section', '[aria-roledescription="carousel"]', '[aria-roledescription="slide"]', '[alt="Pink Bouquet - image 1"]', 'form.flex', 'h1', 'footer', '.fixed.bottom-3'];
    return selectors.map(selector => {
      const el = document.querySelector(selector); if (!el) return { selector, missing: true };
      const r = el.getBoundingClientRect(), c = getComputedStyle(el);
      return { selector, tag: el.tagName, classes: el.className, rect: { x: r.x, y: r.y, width: r.width, height: r.height }, style: { margin: c.margin, padding: c.padding, aspectRatio: c.aspectRatio, height: c.height, font: c.font, gap: c.gap, display: c.display, position: c.position } };
    });
  }), null, 2));
} finally { await browser.close(); }
