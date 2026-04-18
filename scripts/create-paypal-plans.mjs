// Run once: node scripts/create-paypal-plans.mjs
// Creates 3 PayPal subscription plans and prints their IDs

const CLIENT_ID = "AVOELRwEG4Utd8tpTCDbYZw7_fsvenusWPCHU2ITeY3G2tvGZgdD6VFrxUCDT6zsqlf7K7yfo8zFj1lW";
const SECRET    = "EFznSBUd46CgOpm1pWtNzc5Onm12y0dUuMjcldOgS6aD5qG9xTc9qc22UGPyZK24S2rl-uKJxUZp3usF";
const PRODUCT_ID = "PROD-68L11277H40295948";
const BASE = "https://api-m.paypal.com";

async function getToken() {
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + Buffer.from(`${CLIENT_ID}:${SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Auth failed: " + JSON.stringify(data));
  return data.access_token;
}

async function createPlan(token, name, price) {
  const res = await fetch(`${BASE}/v1/billing/plans`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_id: PRODUCT_ID,
      name: `Flashttoo ${name}`,
      status: "ACTIVE",
      billing_cycles: [
        {
          frequency: { interval_unit: "MONTH", interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: { value: String(price), currency_code: "USD" },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 2,
      },
    }),
  });
  const data = await res.json();
  if (!data.id) throw new Error(`Plan ${name} failed: ` + JSON.stringify(data));
  return data.id;
}

(async () => {
  console.log("Connecting to PayPal Live...");
  const token = await getToken();
  console.log("✓ Auth OK\n");

  const basicId  = await createPlan(token, "Basic",  5);
  console.log(`✓ Basic  → ${basicId}`);

  const proId    = await createPlan(token, "Pro",    10);
  console.log(`✓ Pro    → ${proId}`);

  const studioId = await createPlan(token, "Studio", 25);
  console.log(`✓ Studio → ${studioId}`);

  console.log("\n--- Copiá esto en tus env vars ---");
  console.log(`PAYPAL_PLAN_BASIC=${basicId}`);
  console.log(`PAYPAL_PLAN_PRO=${proId}`);
  console.log(`PAYPAL_PLAN_STUDIO=${studioId}`);
})();
