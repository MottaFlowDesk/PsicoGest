"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationItem } from "./notification-item";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  action_url: string | null;
  created_at: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Get professional ID on mount
  useEffect(() => {
    async function getProfessionalId() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: professional } = await supabase
          .from("professionals")
          .select("id")
          .eq("user_id", user.id)
          .single();
        if (professional) {
          setProfessionalId(professional.id);
        }
      }
    }
    getProfessionalId();
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    if (open) {
      fetchNotifications();
    }
  }, [open]);

  // Set up real-time subscription for new notifications
  useEffect(() => {
    if (!professionalId) return;

    const channel = supabase
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
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
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
          const updatedNotification = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
          );
          if (updatedNotification.read) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [professionalId]);

  // Poll for unread count every 30 seconds as fallback
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  async function fetchUnreadCount() {
    try {
      const response = await fetch("/api/notifications/unread-count");
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  }

  async function fetchNotifications() {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications?limit=10&read=false");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsRead(notificationId: string) {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }

  function handleNotificationClick(notification: Notification) {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }

    if (notification.action_url) {
      router.push(notification.action_url);
      setOpen(false);
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative p-2 text-slate-400 hover:text-slate-600"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Notificações
            </h3>
            {unreadCount > 0 && (
              <span className="text-xs text-slate-500">
                {unreadCount} não lida{unreadCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-slate-500">
              Carregando...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">
              Nenhuma notificação não lida
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-sm font-medium ${
                              notification.read
                                ? "text-slate-600"
                                : "text-slate-900"
                            }`}
                          >
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-brand-600 rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-4 py-2">
          <button
            onClick={() => {
              router.push("/dashboard/notifications");
              setOpen(false);
            }}
            className="w-full text-xs text-brand-600 hover:text-brand-700 font-medium text-center"
          >
            Ver todas as notificações
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

