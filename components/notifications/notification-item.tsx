"use client";

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  action_url: string | null;
  created_at: string;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
}: NotificationItemProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleMarkAsRead() {
    if (notification.read || !onMarkAsRead) return;

    try {
      const response = await fetch(`/api/notifications/${notification.id}`, {
        method: "PATCH",
      });

      if (response.ok) {
        onMarkAsRead(notification.id);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }

  async function handleDelete() {
    if (isDeleting || !onDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/notifications/${notification.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onDelete(notification.id);
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    } finally {
      setIsDeleting(false);
    }
  }

  function handleClick() {
    if (!notification.read) {
      handleMarkAsRead();
    }

    if (notification.action_url) {
      router.push(notification.action_url);
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "appointment":
        return "bg-blue-100 text-blue-700";
      case "payment":
        return "bg-green-100 text-green-700";
      case "patient":
        return "bg-purple-100 text-purple-700";
      case "system":
        return "bg-orange-100 text-orange-700";
      case "subscription":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "appointment":
        return "Agendamento";
      case "payment":
        return "Pagamento";
      case "patient":
        return "Paciente";
      case "system":
        return "Sistema";
      case "subscription":
        return "Assinatura";
      default:
        return type;
    }
  };

  return (
    <div
      className={`p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
        !notification.read ? "bg-blue-50/50" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${getTypeColor(
                  notification.type
                )}`}
              >
                {getTypeLabel(notification.type)}
              </span>
              <h4
                className={`text-sm font-medium truncate ${
                  notification.read ? "text-slate-600" : "text-slate-900"
                }`}
              >
                {notification.title}
              </h4>
              {!notification.read && (
                <span className="w-2 h-2 bg-brand-600 rounded-full flex-shrink-0 mt-1.5" />
              )}
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-2">{notification.message}</p>
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </p>
            <div className="flex items-center gap-2">
              {notification.action_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleClick}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Ver
                </Button>
              )}
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleMarkAsRead}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Marcar como lida
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-red-600 hover:text-red-700"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

