import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport + 1);
}

async function expectVisibleImagesLoaded(page: Page) {
  await expect
    .poll(async () =>
      page.locator("img").evaluateAll((images) =>
        images
          .filter((image) => {
            const r = image.getBoundingClientRect();
            return (
              r.width > 0 &&
              r.height > 0 &&
              r.bottom > 0 &&
              r.top < innerHeight &&
              r.left < innerWidth &&
              r.right > 0
            );
          })
          .every((image) => image.complete && image.naturalWidth > 0),
      ),
    )
    .toBe(true);
}

async function openFirstProduct(page: Page) {
  const product = page.locator('a[href*="/products/"]').first();
  await expect(product).toBeVisible();
  await product.click();
  await expect(page).toHaveURL(/\/en\/products\/[^/]+/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

test("homepage and product reproduce the responsive storefront using local assets", async ({
  page,
}, testInfo) => {
  const externalAssets: string[] = [];
  const failedAssets: string[] = [];
  page.on("request", (request) => {
    if (
      ["image", "font", "stylesheet", "script"].includes(
        request.resourceType(),
      ) &&
      !request.url().startsWith("http://127.0.0.1:5173") &&
      !request.url().startsWith("data:")
    )
      externalAssets.push(request.url());
  });
  page.on("response", (response) => {
    if (
      response.status() >= 400 &&
      ["image", "font", "stylesheet", "script"].includes(
        response.request().resourceType(),
      )
    )
      failedAssets.push(response.url());
  });
  await page.goto("/en/");
  await expect(
    page.getByRole("heading", { name: "Flowers", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByPlaceholder("Search products or stores")
      .filter({ visible: true }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectVisibleImagesLoaded(page);
  await page.screenshot({
    path: testInfo.outputPath("homepage.png"),
    fullPage: true,
  });

  await openFirstProduct(page);
  await expect(
    page.getByRole("button", { name: "Add to cart", exact: true }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectVisibleImagesLoaded(page);
  await page.screenshot({
    path: testInfo.outputPath("product.png"),
    fullPage: true,
  });
  expect(externalAssets).toEqual([]);
  expect(failedAssets).toEqual([]);
});

test("quantity changes and the cart survives a reload", async ({ page }) => {
  await page.goto("/en/");
  await openFirstProduct(page);
  const name = await page.getByRole("heading", { level: 1 }).innerText();
  await expect(
    page.getByRole("button", { name: "Decrement", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Increment", exact: true }).click();
  await expect(page.getByTestId("quantity")).toHaveText("2");
  await page.getByRole("button", { name: "Decrement", exact: true }).click();
  await expect(page.getByTestId("quantity")).toHaveText("1");
  await page.getByRole("button", { name: "Increment", exact: true }).click();
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  await page.goto("/en/cart");
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("search filters the catalog and wishlist toggles", async ({ page }) => {
  await page.goto("/en/");
  const search = page
    .getByPlaceholder("Search products or stores")
    .filter({ visible: true });
  await search.fill("Pink");
  await search.press("Enter");
  await expect(page.locator('a[href*="/products/"]').first()).toBeVisible();
  await expect(page.locator("main")).toContainText(/pink/i);
  await expectNoHorizontalOverflow(page);
  await openFirstProduct(page);
  const wishlist = page
    .getByRole("button", { name: "Add to wishlist", exact: true })
    .first();
  await wishlist.click();
  await expect(
    page
      .getByRole("button", { name: "Remove from wishlist", exact: true })
      .first(),
  ).toBeVisible();
});

test("sign-in opens and Escape closes it", async ({ page }) => {
  await page.goto("/en/");
  await page
    .getByRole("button", { name: "My account", exact: true })
    .filter({ visible: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Sign in", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: /email/i })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("mobile dock remains available while browsing", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-specific navigation.");
  await page.goto("/en/");
  const dock = page.getByRole("navigation", {
    name: "Mobile navigation",
    exact: true,
  });
  await expect(dock).toBeVisible();
  await expect(
    dock.getByRole("button", { name: "Categories", exact: true }),
  ).toBeVisible();
  await expect(
    dock.getByRole("link", { name: "My cart", exact: true }),
  ).toBeVisible();
  await expect(
    dock.getByRole("button", { name: "AI", exact: true }),
  ).toBeVisible();
  await openFirstProduct(page);
  await expect(dock).toBeVisible();
  await dock.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/?$/);
});
