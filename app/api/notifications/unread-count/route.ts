import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/notifications/unread-count
 * Get unread notification count for the authenticated professional
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get professional
    const { data: professional } = await supabase
      .from("professionals")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!professional) {
      return NextResponse.json({ error: "Professional not found" }, { status: 404 });
    }

    const { getUnreadCount } = await import("@/lib/notifications/notification-service");
    const count = await getUnreadCount(professional.id);

    return NextResponse.json({ count });
  } catch (error: any) {
    console.error("Error in GET /api/notifications/unread-count:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

