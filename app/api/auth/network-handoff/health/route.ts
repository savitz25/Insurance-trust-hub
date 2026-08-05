import { NextResponse } from "next/server";
import { isSupabaseAdminConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Probe: production must return 200 JSON (not 404). Deploy stamp: 2026-08-05-sso */
export async function GET() {
  return NextResponse.json({
    ok: true,
    hub: "insurance",
    serviceRole: isSupabaseAdminConfigured(),
    deployStamp: "2026-08-05-sso-v2",
    routes: {
      start: "/api/auth/network-handoff/start",
      complete: "/auth/network-handoff",
    },
  });
}