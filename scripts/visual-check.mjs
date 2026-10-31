import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const output = "research/implementation";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 1000 }],
  ["mobile", { width: 390, height: 844 }],
  ["tablet", { width: 768, height: 1024 }],
  ["small-mobile", { width: 320, height: 740 }],
]) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [kind, path] of [
    ["home", "/en/"],
    ["product", "/en/products/b99d12e1-4d70-4728-b7fc-10b4a818320b"],
  ]) {
    await page.goto("http://127.0.0.1:5173" + path);
    await page.evaluate(() => document.fonts.ready);
    await page
      .locator(kind === "home" ? ".banner img" : ".main-product-image img")
      .first()
      .evaluate((i) => i.decode());
    await page.screenshot({ path: `${output}/${name}-${kind}.png` });
    const metrics = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      landmarks: [
        ...document.querySelectorAll(
          ".site-header,.store-rail,.banner-carousel,.section-title,.category-carousel,.section-subheader,.product-grid,.main-product-image,.product-intro,.price-quantity,.purchase-actions",
        ),
      ]
        .slice(0, 12)
        .map((el) => ({
          class: el.className,
          rect: el.getBoundingClientRect().toJSON(),
        })),
    }));
    await fs.writeFile(
      `${output}/${name}-${kind}.json`,
      JSON.stringify({ metrics, errors }, null, 2),
    );
  }
  await page.close();
}
await browser.close();
console.log(
  "Saved desktop, mobile, tablet and 320px screenshots and layout measurements.",
);
