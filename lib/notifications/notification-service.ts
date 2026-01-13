import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export type NotificationType = 'appointment' | 'payment' | 'patient' | 'system' | 'subscription';

export interface NotificationData {
  [key: string]: any;
}

export interface CreateNotificationParams {
  professionalId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: NotificationData;
  actionUrl?: string;
}

export interface Notification {
  id: string;
  professional_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: NotificationData;
  read: boolean;
  read_at: string | null;
  action_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new notification
 */
export async function createNotification(params: CreateNotificationParams): Promise<Notification | null> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        professional_id: params.professionalId,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data || {},
        action_url: params.actionUrl || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating notification:", error);
      return null;
    }

    return data as Notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string, professionalId: string): Promise<boolean> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error } = await supabase
      .from("notifications")
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", notificationId)
      .eq("professional_id", professionalId);

    if (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }
}

/**
 * Mark all notifications as read for a professional
 */
export async function markAllAsRead(professionalId: string): Promise<boolean> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error } = await supabase
      .from("notifications")
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq("professional_id", professionalId)
      .eq("read", false);

    if (error) {
      console.error("Error marking all notifications as read:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return false;
  }
}

/**
 * Get notifications for a professional
 */
export interface GetNotificationsFilters {
  type?: NotificationType;
  read?: boolean;
  limit?: number;
  offset?: number;
}

export async function getNotifications(
  professionalId: string,
  filters?: GetNotificationsFilters
): Promise<{ notifications: Notification[]; total: number }> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    let query = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("professional_id", professionalId)
      .order("created_at", { ascending: false });

    if (filters?.type) {
      query = query.eq("type", filters.type);
    }

    if (filters?.read !== undefined) {
      query = query.eq("read", filters.read);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error getting notifications:", error);
      return { notifications: [], total: 0 };
    }

    return {
      notifications: (data || []) as Notification[],
      total: count || 0,
    };
  } catch (error) {
    console.error("Error getting notifications:", error);
    return { notifications: [], total: 0 };
  }
}

/**
 * Get unread count for a professional
 */
export async function getUnreadCount(professionalId: string): Promise<number> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("professional_id", professionalId)
      .eq("read", false);

    if (error) {
      console.error("Error getting unread count:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string, professionalId: string): Promise<boolean> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("professional_id", professionalId);

    if (error) {
      console.error("Error deleting notification:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting notification:", error);
    return false;
  }
}

