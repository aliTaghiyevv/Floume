import { expect, test, type Page } from "@playwright/test";

const firstProduct = "b99d12e1-4d70-4728-b7fc-10b4a818320b";
const localReply = {
  message: "Here is a gentle pink and white bouquet for your celebration.",
  productIds: [firstProduct],
  suggestions: ["Make it more colorful"],
  design: {
    flowers: [
      { id: "flower-1", quantity: 2 },
      { id: "flower-2", quantity: 1 },
    ],
    note: "A soft pink and white arrangement.",
  },
  provider: "ollama",
  model: "test-local-model",
};

async function openCustomizer(page: Page) {
  await page
    .getByRole("button", { name: "Customize", exact: true })
    .filter({ visible: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveAccessibleName(
    "Design your own bouquet",
  );
  return page.getByRole("dialog");
}
async function noOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    width: innerWidth,
    dialog: [...document.querySelectorAll('[role="dialog"]')].map((el) => ({
      scroll: el.scrollWidth,
      width: el.clientWidth,
    })),
  }));
  expect(sizes.page).toBeLessThanOrEqual(sizes.width + 1);
  for (const dialog of sizes.dialog)
    expect(dialog.scroll).toBeLessThanOrEqual(dialog.width + 1);
}
async function selectFlowers(page: Page) {
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "White Alstroemeria", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "White Alstroemeria 1", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Pink Alstroemeria", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "White Alstroemeria 2", exact: true }),
  ).toBeVisible();
}
async function mockStatus(page: Page) {
  await page.route("**/api/ai/status", (route) =>
    route.fulfill({
      json: { ready: true, provider: "ollama", model: "test-local-model" },
    }),
  );
}

test("flower selection, quantity removal, search and reset work without losing a draft", async ({
  page,
}) => {
  await page.goto("/en/");
  const dialog = await openCustomizer(page);
  await expect(
    dialog.getByRole("button", { name: "Continue", exact: true }),
  ).toBeDisabled();
  await selectFlowers(page);
  await dialog
    .getByRole("button", { name: "Decrease White Alstroemeria", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "White Alstroemeria 1", exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Decrease Pink Alstroemeria", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Pink Alstroemeria", exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", {
      name: "Decrease Pink Alstroemeria",
      exact: true,
    }),
  ).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Search flowers...", exact: true })
    .click();
  await dialog
    .getByRole("textbox", { name: "Search flowers", exact: true })
    .fill("Sunflower");
  await expect(
    dialog.getByRole("button", { name: "Sunflower", exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Pink Alstroemeria", exact: true }),
  ).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Close flower search", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(dialog).toHaveAccessibleName("Choose a store");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page
    .getByRole("button", { name: "Customize", exact: true })
    .filter({ visible: true })
    .click();
  await expect(dialog).toHaveAccessibleName("Choose a store");
  await dialog.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "White Alstroemeria 1", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Customize", exact: true })
    .filter({ visible: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "White Alstroemeria 1", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Continue", exact: true }),
  ).toBeDisabled();
  await expect(dialog).toContainText("The bouquet is empty");
  await noOverflow(page);
});

test("five-step customization saves the composition and cart persists after reload", async ({
  page,
}, testInfo) => {
  await page.goto("/en/");
  const dialog = await openCustomizer(page);
  await page.screenshot({ path: testInfo.outputPath("customizer-empty.png") });
  await selectFlowers(page);
  await page.screenshot({
    path: testInfo.outputPath("customizer-selected.png"),
  });
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(dialog).toHaveAccessibleName("Choose a store");
  await expect(
    dialog.getByRole("button", { name: "Continue", exact: true }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: /Aes Flowers/ }).click();
  await page.screenshot({ path: testInfo.outputPath("customizer-store.png") });
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(dialog).toHaveAccessibleName("Choose a base");
  await dialog
    .getByRole("button", { name: /Pink Statue Head Planter/ })
    .click();
  await page.screenshot({ path: testInfo.outputPath("customizer-base.png") });
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(dialog).toHaveAccessibleName("Decor & ribbons");
  await dialog
    .getByRole("button", {
      name: "Increase Mustard Yellow Wrapping Paper",
      exact: true,
    })
    .click();
  await page.screenshot({ path: testInfo.outputPath("customizer-decor.png") });
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(dialog).toHaveAccessibleName("Complete your order");
  await expect(dialog).toContainText("₼16.20");
  await expect(
    dialog.getByRole("button", { name: "Save bouquet", exact: true }),
  ).toBeDisabled();
  await dialog
    .getByRole("radio", { name: "Pickup point", exact: true })
    .check();
  await dialog.getByRole("checkbox", { name: /^Order note/ }).check();
  await dialog
    .getByRole("textbox", { name: "Order note", exact: true })
    .fill("Please keep the wrapping simple.");
  await page.screenshot({ path: testInfo.outputPath("customizer-review.png") });
  await noOverflow(page);
  await dialog
    .getByRole("button", { name: "Save bouquet", exact: true })
    .click();
  await expect(dialog).toHaveAccessibleName("Bouquet saved");
  await dialog
    .getByRole("button", { name: "Continue browsing", exact: true })
    .click();
  await page.goto("/en/cart");
  const custom = page.locator(".custom-cart-item");
  await expect(custom).toContainText("Design your own bouquet");
  await expect(custom).toContainText("White Alstroemeria ×2");
  await expect(custom).toContainText("Pink Statue Head Planter");
  await expect(custom).toContainText("Please keep the wrapping simple.");
  await expect(custom).toContainText("₼16.20");
  await page.reload();
  await expect(custom).toContainText("White Alstroemeria ×2");
  await noOverflow(page);
});

test("narrow customizer remains contained and keyboard placement works", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/en/");
  const dialog = await openCustomizer(page);
  await dialog
    .getByRole("button", { name: "White Alstroemeria", exact: true })
    .click();
  const flower = dialog.getByRole("button", {
    name: "Move White Alstroemeria 1",
    exact: true,
  });
  await flower.focus();
  const before = await flower.getAttribute("style");
  await flower.press("ArrowRight");
  await expect(flower).not.toHaveAttribute("style", before!);
  await noOverflow(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("local AI recommendations add to cart and seed the manual builder", async ({
  page,
}, testInfo) => {
  await mockStatus(page);
  await page.route("**/api/ai/chat", (route) =>
    route.fulfill({ json: localReply }),
  );
  await page.goto("/en/");
  await page
    .getByRole("button", { name: "AI", exact: true })
    .filter({ visible: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Floume AI online" });
  await expect(
    dialog.getByRole("heading", { name: "Hi, welcome", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("ai-welcome.png") });
  await dialog
    .getByRole("button", { name: "Birthday bouquet", exact: true })
    .click();
  await expect(dialog).toContainText(localReply.message);
  await expect(
    dialog.getByRole("heading", { name: "Pink Bouquet", exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Add to cart", exact: true })
    .click();
  await page.screenshot({ path: testInfo.outputPath("ai-result.png") });
  await dialog
    .getByRole("button", { name: "Customize this bouquet", exact: true })
    .click();
  const builder = page.getByRole("dialog", { name: "Design your own bouquet" });
  await expect(
    builder.getByRole("button", { name: "White Alstroemeria 2", exact: true }),
  ).toBeVisible();
  await expect(
    builder.getByRole("button", { name: "Pink Alstroemeria 1", exact: true }),
  ).toBeVisible();
  await noOverflow(page);
  await builder.getByRole("button", { name: "Close", exact: true }).click();
  await page.goto("/en/cart");
  await expect(
    page.locator(".cart-item").filter({ hasText: "Pink Bouquet" }),
  ).toBeVisible();
});

test("local AI request errors can be retried without duplicating the user message", async ({
  page,
}) => {
  await mockStatus(page);
  let attempts = 0;
  await page.route("**/api/ai/chat", (route) => {
    attempts++;
    return attempts === 1
      ? route.fulfill({
          status: 503,
          json: {
            error: { message: "The local model is temporarily unavailable." },
          },
        })
      : route.fulfill({ json: { ...localReply, design: null } });
  });
  await page.goto("/en/");
  await page
    .getByRole("button", { name: "AI", exact: true })
    .filter({ visible: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Floume AI online" });
  await dialog
    .getByRole("textbox", { name: "Type a message…", exact: true })
    .fill("A small bouquet for mom");
  await dialog
    .getByRole("button", { name: "Send message", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "temporarily unavailable",
  );
  await dialog.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(dialog).toContainText(localReply.message);
  await expect(dialog.locator(".ai-message-user")).toHaveCount(1);
  expect(attempts).toBe(2);
  await noOverflow(page);
});
