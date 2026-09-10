"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useModal } from "@/providers/modal-context";
import AddEventModal from "@/components/schedule/_modals/add-event-modal";
import { Event, CustomEventModal } from "@/types";
import { TrashIcon, CalendarIcon, ClockIcon } from "lucide-react";
import { useScheduler } from "@/providers/schedular-provider";
import { cn } from "@/lib/utils";
import CustomModal, {
  CustomModalContent,
  CustomModalHeader,
  CustomModalTitle,
} from "../../../../ui/custom-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatDate = (date: Date) => {
  return date.toLocaleString("pt-BR", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
};

const formatTime = (date: Date) => {
  return date.toLocaleString("pt-BR", {
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
};

const variantColors = {
  primary: {
    bg: "bg-blue-100",
    border: "border-blue-200",
    text: "text-blue-800",
  },
  danger: {
    bg: "bg-red-100",
    border: "border-red-200",
    text: "text-red-800",
  },
  success: {
    bg: "bg-green-100",
    border: "border-green-200",
    text: "text-green-800",
  },
  warning: {
    bg: "bg-yellow-100",
    border: "border-yellow-200",
    text: "text-yellow-800",
  },
};

function getStatusWrapperClasses(status?: string) {
  switch (status) {
    case "confirmed":
      return "border-green-400 bg-green-50/80 ring-1 ring-green-200";
    case "cancelled":
      return "border-red-300 bg-red-50/80";
    case "no_show":
      return "border-orange-300 bg-orange-50/80";
    case "completed":
      return "border-slate-300 bg-slate-50/80";
    default:
      return "border-blue-200 bg-blue-50/30";
  }
}

interface EventStyledProps extends Event {
  minmized?: boolean;
  CustomEventComponent?: React.FC<Event>;
}

export default function EventStyled({
  event,
  onDelete,
  CustomEventModal,
}: {
  event: EventStyledProps;
  CustomEventModal?: CustomEventModal;
  onDelete?: (id: string) => void;
}) {
  const { setOpen } = useModal();
  const { handlers } = useScheduler();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAppointment = event.metadata?.type === "appointment";
  const canDelete = isAppointment;

  function handleEditEvent(editEvent: Event) {
    setOpen(
      <CustomModal>
        <CustomModalContent>
          <CustomModalHeader>
            <CustomModalTitle>Edit Event</CustomModalTitle>
          </CustomModalHeader>
          <AddEventModal
            CustomAddEventModal={
              CustomEventModal?.CustomAddEventModal?.CustomForm
            }
          />
        </CustomModalContent>
      </CustomModal>,
      async () => ({
        ...editEvent,
      })
    );
  }

  const getBackgroundColor = (variant: string | undefined) => {
    const variantKey = variant as keyof typeof variantColors || "primary";
    const colors = variantColors[variantKey] || variantColors.primary;
    return `${colors.bg} ${colors.text} ${colors.border}`;
  };

  async function handleConfirmDelete() {
    setIsDeleting(true);
    try {
      await handlers.handleDeleteEvent(event.id);
      onDelete?.(event.id);
      setDeleteDialogOpen(false);
    } catch {
      // Erro tratado no callback do calendário (toast)
    } finally {
      setIsDeleting(false);
    }
  }

  const appointmentStatus = event.metadata?.status as string | undefined;

  return (
    <>
      <div
        key={event?.id}
        className={cn(
          "w-full relative cursor-pointer border-2 group rounded-lg flex flex-col",
          event?.minmized
            ? "h-full min-h-0 overflow-hidden border-transparent shadow-none"
            : cn(
                "z-50 flex-grow shadow-sm hover:shadow-md transition-all duration-300",
                getStatusWrapperClasses(appointmentStatus)
              )
        )}
      >
        {canDelete && (
          <Button
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              setDeleteDialogOpen(true);
            }}
            variant="destructive"
            size="icon"
            className={cn(
              "absolute z-[100] p-0 shadow-md hover:bg-destructive/90 transition-all duration-200",
              event?.minmized
                ? "right-0.5 top-0.5 h-5 w-5 opacity-0 group-hover:opacity-100"
                : "right-1 top-[-8px] h-6 w-6 opacity-100"
            )}
          >
            <TrashIcon size={14} className="text-destructive-foreground" />
          </Button>
        )}

        {event.CustomEventComponent ? (
          <div
            className={cn(event?.minmized && "h-full min-h-0 overflow-hidden")}
            onClick={(e: React.MouseEvent<HTMLDivElement>) => {
              e.stopPropagation();
              handleEditEvent({
                id: event?.id,
                title: event?.title,
                startDate: event?.startDate,
                endDate: event?.endDate,
                description: event?.description,
                variant: event?.variant,
                metadata: event?.metadata,
              });
            }}
          >
            <event.CustomEventComponent {...event} />
          </div>
        ) : (
          <div
            onClick={(e: React.MouseEvent<HTMLDivElement>) => {
              e.stopPropagation();
              handleEditEvent({
                id: event?.id,
                title: event?.title,
                startDate: event?.startDate,
                endDate: event?.endDate,
                description: event?.description,
                variant: event?.variant,
                metadata: event?.metadata,
              });
            }}
            className={cn(
              "w-full p-2 rounded",
              getBackgroundColor(event?.variant),
              event?.minmized ? "flex-grow overflow-hidden" : "min-h-fit"
            )}
          >
            <div className="flex flex-col h-full">
              <div className="font-semibold text-xs truncate mb-1">
                {event?.title || "Untitled Event"}
              </div>

              {event?.minmized && (
                <div className="text-[10px] opacity-80">
                  {formatTime(event?.startDate)}
                </div>
              )}

              {!event?.minmized && event?.description && (
                <div className="my-2 text-sm">{event?.description}</div>
              )}

              {!event?.minmized && (
                <div className="text-xs space-y-1 mt-2">
                  <div className="flex items-center">
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {formatDate(event?.startDate)}
                  </div>
                  <div className="flex items-center">
                    <ClockIcon className="mr-1 h-3 w-3" />
                    {formatDate(event?.endDate)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-slate-600">
                <p>
                  Tem certeza que deseja excluir o agendamento com{" "}
                  <strong>{event.title}</strong>?
                </p>
                <p>
                  {format(event.startDate, "EEEE, d 'de' MMMM", { locale: ptBR })}{" "}
                  às {format(event.startDate, "HH:mm")} — {format(event.endDate, "HH:mm")}
                </p>
                <p className="text-slate-500">Esta ação não pode ser desfeita.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
