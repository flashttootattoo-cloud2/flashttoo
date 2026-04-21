"use client";

import { PayPalScriptProvider, PayPalButtons as PPButtons } from "@paypal/react-paypal-js";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { PlanType } from "@/types/database";

interface PayPalButtonsProps {
  planId: string;
  planName: string;
  userId: string;
  planType: Exclude<PlanType, "free" | "premium">;
}

export function PayPalButtons({ planId, planName, userId, planType }: PayPalButtonsProps) {
  const router = useRouter();

  return (
    <PayPalScriptProvider
      options={{
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "test",
        vault: true,
        intent: "subscription",
        currency: "USD",
      }}
    >
      <PPButtons
        style={{ layout: "vertical", color: "gold", shape: "rect", label: "subscribe" }}
        createSubscription={(_data, actions) => {
          return actions.subscription.create({
            plan_id: planId,
            application_context: {
              shipping_preference: "NO_SHIPPING",
              return_url: `${window.location.origin}/dashboard`,
              cancel_url: `${window.location.origin}/plans`,
            },
          });
        }}
        onApprove={async (data) => {
          const res = await fetch("/api/paypal/activate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscriptionId: data.subscriptionID, planType }),
          });

          if (!res.ok) {
            toast.error("Error al activar el plan. Contactá soporte.");
            return;
          }

          toast.success(`¡Plan ${planName} activado! Bienvenido.`);
          router.push("/dashboard");
          router.refresh();
        }}
        onError={() => {
          toast.error("Error en el pago. Intentá de nuevo.");
        }}
      />
    </PayPalScriptProvider>
  );
}
