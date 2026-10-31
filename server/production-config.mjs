export function readProductionConfig(env = process.env) {
  const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "BIRBANK_API_URL", "BIRBANK_MERCHANT_ID", "BIRBANK_SECRET_KEY", "BIRBANK_WEBHOOK_SECRET"];
  const missing = required.filter((name) => !env[name]);
  return { configured: missing.length === 0, paymentsEnabled: false, missing };
}
