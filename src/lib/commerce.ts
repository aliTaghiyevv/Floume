export type Currency = string;
export type OrderStatus = "pending_payment" | "paid" | "accepted" | "preparing" | "ready" | "dispatched" | "delivered" | "cancelled" | "refunded";
export type Money = { amountMinor: number; currency: Currency };
export type Address = {
  countryCode: string; region?: string; city: string; street: string; building: string;
  apartment?: string; postalCode?: string; latitude?: number; longitude?: number; deliveryNotes?: string;
};
export type CartLine = { productId: string; quantity: number; customBouquet?: unknown };
export type CheckoutQuote = {
  items: Array<CartLine & { name: string; unitPrice: Money; lineTotal: Money }>;
  subtotal: Money; delivery: Money; tax: Money; discount: Money; total: Money; expiresAt: string;
};
export type CreateCheckoutRequest = { address: Address; deliverySlot?: string; promoCode?: string };
export type PaymentSession = { provider: string; paymentId: string; redirectUrl?: string; clientSecret?: string };
export interface PaymentAdapter {
  createPayment(input: { orderId: string; amount: Money; returnUrl: string; idempotencyKey: string }): Promise<PaymentSession>;
  retrievePayment(paymentId: string): Promise<{ status: "pending" | "succeeded" | "failed" | "cancelled" }>;
  refundPayment(paymentId: string, amount?: Money): Promise<void>;
  verifyWebhook(headers: Headers, rawBody: string): Promise<{ eventId: string; type: string; paymentId: string; orderId?: string; status: string }>;
}
export interface NotificationAdapter {
  send(input: { userId: string; event: string; orderId?: string; data?: Record<string, unknown> }): Promise<void>;
}
export interface AiProvider {
  chat(input: { messages: Array<{ role: "user" | "assistant"; content: string }>; userId?: string }): Promise<unknown>;
  generateImage(input: { prompt: string; references?: string[]; userId?: string }): Promise<{ jobId: string }>;
}
