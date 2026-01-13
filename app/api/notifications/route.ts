import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/notifications
 * List notifications for the authenticated professional
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");
    const read = searchParams.get("read");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query
    let query = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("professional_id", professional.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq("type", type);
    }

    if (read !== null) {
      query = query.eq("read", read === "true");
    }

    const { data: notifications, error, count } = await query;

    if (error) {
      console.error("Error fetching notifications:", error);
      return NextResponse.json(
        { error: "Failed to fetch notifications" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      notifications: notifications || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("Error in GET /api/notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Create a notification (server-side only, uses service role)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { professionalId, type, title, message, data, actionUrl } = body;

    if (!professionalId || !type || !title || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify user has permission (must be the professional or admin)
    const { data: professional } = await supabase
      .from("professionals")
      .select("id, user_id")
      .eq("id", professionalId)
      .single();

    if (!professional || professional.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Create notification using service role
    const { createNotification } = await import("@/lib/notifications/notification-service");
    const notification = await createNotification({
      professionalId,
      type,
      title,
      message,
      data,
      actionUrl,
    });

    if (!notification) {
      return NextResponse.json(
        { error: "Failed to create notification" },
        { status: 500 }
      );
    }

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * Mark notification(s) as read
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAll } = body;

    // Get professional
    const { data: professional } = await supabase
      .from("professionals")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!professional) {
      return NextResponse.json({ error: "Professional not found" }, { status: 404 });
    }

    if (markAll) {
      // Mark all as read
      const { markAllAsRead } = await import("@/lib/notifications/notification-service");
      const success = await markAllAsRead(professional.id);

      if (!success) {
        return NextResponse.json(
          { error: "Failed to mark all as read" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    } else {
      // Mark single notification as read
      if (!notificationId) {
        return NextResponse.json(
          { error: "notificationId is required" },
          { status: 400 }
        );
      }

      const { markAsRead } = await import("@/lib/notifications/notification-service");
      const success = await markAsRead(notificationId, professional.id);

      if (!success) {
        return NextResponse.json(
          { error: "Failed to mark as read" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }
  } catch (error: any) {
    console.error("Error in PATCH /api/notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

