import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { userId } = await request.json();
  const authHeader = request.headers.get("authorization");
  if (!userId || !authHeader) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: { user }, error: authError } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authError || !user || user.id !== userId) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
