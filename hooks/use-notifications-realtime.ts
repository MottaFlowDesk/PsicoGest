"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  action_url: string | null;
  created_at: string;
}

interface UseNotificationsRealtimeOptions {
  professionalId: string;
  onNewNotification?: (notification: Notification) => void;
  onNotificationUpdate?: (notification: Notification) => void;
}

/**
 * Hook to listen for real-time notification updates via Supabase Realtime
 */
export function useNotificationsRealtime({
  professionalId,
  onNewNotification,
  onNotificationUpdate,
}: UseNotificationsRealtimeOptions) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!professionalId) return;

    const supabase = createClient();

    // Subscribe to notifications for this professional
    const notificationsChannel = supabase
      .channel(`notifications:${professionalId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `professional_id=eq.${professionalId}`,
        },
        (payload) => {
          const notification = payload.new as Notification;
          if (onNewNotification) {
            onNewNotification(notification);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `professional_id=eq.${professionalId}`,
        },
        (payload) => {
          const notification = payload.new as Notification;
          if (onNotificationUpdate) {
            onNotificationUpdate(notification);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    setChannel(notificationsChannel);

    return () => {
      if (notificationsChannel) {
        supabase.removeChannel(notificationsChannel);
      }
    };
  }, [professionalId, onNewNotification, onNotificationUpdate]);

  return {
    isConnected,
    channel,
  };
}

