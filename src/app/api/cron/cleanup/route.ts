import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Vercel cron llama a este endpoint diariamente.
// Protegido con CRON_SECRET para que nadie lo llame desde afuera.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error, count } = await supabase
    .from("view_events")
    .delete({ count: "exact" })
    .lt("viewed_at", thirtyDaysAgo);

  if (error) {
    console.error("[cron/cleanup] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[cron/cleanup] eliminados ${count} view_events de más de 30 días`);
  return NextResponse.json({ deleted: count });
}
