// The merchant contract must define endpoints, payloads and webhook signing.
// Until that contract is implemented and tested, money operations fail closed.
export class PaymentConfigurationError extends Error {}

export function createBirbankAdapter() {
  const unavailable = async () => {
    throw new PaymentConfigurationError(
      "Birbank integration is disabled pending verified merchant API and webhook specification.",
    );
  };
  return {
    configured: false,
    createPayment: unavailable,
    retrievePayment: unavailable,
    refundPayment: unavailable,
    cancelPayment: unavailable,
    reconcilePayment: unavailable,
    verifyWebhook: unavailable,
  };
}
