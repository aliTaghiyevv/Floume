import test from "node:test";
import assert from "node:assert/strict";
import { createBirbankAdapter, PaymentConfigurationError } from "./payment.mjs";

test("Birbank money operations fail closed even when credentials are supplied", async () => {
  const adapter = createBirbankAdapter({ BIRBANK_SECRET_KEY: "test" });
  assert.equal(adapter.configured, false);
  for (const method of ["createPayment", "retrievePayment", "refundPayment", "cancelPayment", "reconcilePayment", "verifyWebhook"]) {
    await assert.rejects(() => adapter[method](), PaymentConfigurationError);
  }
});
