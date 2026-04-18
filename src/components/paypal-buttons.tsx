"use client";

import { PayPalScriptProvider, PayPalButtons as PPButtons } from "@paypal/react-paypal-js";
import { createClient } from "@/lib/supabase/client";
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
  const supabase = createClient();
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
          return actions.subscription.create({ plan_id: planId });
        }}
        onApprove={async (data) => {
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 1);

          const { error } = await supabase
            .from("profiles")
            .update({
              plan: planType,
              plan_expires_at: expiresAt.toISOString(),
              paypal_subscription_id: data.subscriptionID ?? null,
            })
            .eq("id", userId);

          if (error) {
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
