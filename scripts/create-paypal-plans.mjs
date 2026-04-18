// Run once: node scripts/create-paypal-plans.mjs
// Requires NEXT_PUBLIC_PAYPAL_CLIENT_ID and PAYPAL_SECRET in .env.local
// Creates 3 PayPal subscription plans and prints their IDs

import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local manually
try {
  const env = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
  }
} catch {}

const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
const SECRET    = process.env.PAYPAL_SECRET;
const PRODUCT_ID = "PROD-68L11277H40295948";

if (!CLIENT_ID || !SECRET) {
  console.error("Falta NEXT_PUBLIC_PAYPAL_CLIENT_ID o PAYPAL_SECRET en .env.local");
  process.exit(1);
}
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
