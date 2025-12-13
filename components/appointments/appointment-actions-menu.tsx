"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    MoreVertical,
    CheckCircle,
    XCircle,
    Clock,
    Edit,
    UserX,
    Loader2,
} from "lucide-react";
import {
    confirmAppointment,
    completeAppointment,
    cancelAppointment,
    markAsNoShow,
} from "@/app/dashboard/appointments/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface AppointmentActionsMenuProps {
    appointmentId: string;
    currentStatus: string;
    patientName: string;
    onEdit?: () => void;
}

export function AppointmentActionsMenu({
    appointmentId,
    currentStatus,
    patientName,
    onEdit,
}: AppointmentActionsMenuProps) {
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            await confirmAppointment(appointmentId);
            toast.success("Agendamento confirmado!");
            router.refresh();
        } catch (error) {
            toast.error("Erro ao confirmar agendamento");
        } finally {
            setIsLoading(false);
        }
    };

    const handleComplete = async () => {
        setIsLoading(true);
        try {
            await completeAppointment(appointmentId);
            toast.success("Sessão marcada como concluída!");
            router.refresh();
        } catch (error) {
            toast.error("Erro ao concluir sessão");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = async () => {
        setIsLoading(true);
        try {
            await cancelAppointment(appointmentId, cancelReason);
            toast.success("Agendamento cancelado");
            setCancelDialogOpen(false);
            setCancelReason("");
            router.refresh();
        } catch (error) {
            toast.error("Erro ao cancelar agendamento");
        } finally {
            setIsLoading(false);
        }
    };

    const handleNoShow = async () => {
        setIsLoading(true);
        try {
            await markAsNoShow(appointmentId);
            toast.success("Marcado como não compareceu");
            router.refresh();
        } catch (error) {
            toast.error("Erro ao marcar como não compareceu");
        } finally {
            setIsLoading(false);
        }
    };

    const canConfirm = currentStatus === "scheduled";
    const canComplete = currentStatus === "confirmed" || currentStatus === "scheduled";
    const canCancel = currentStatus !== "cancelled" && currentStatus !== "completed";
    const canMarkNoShow = currentStatus === "scheduled" || currentStatus === "confirmed";

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-slate-600"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <MoreVertical className="h-4 w-4" />
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    {onEdit && canCancel && (
                        <DropdownMenuItem onClick={onEdit}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                        </DropdownMenuItem>
                    )}

                    {canConfirm && (
                        <DropdownMenuItem onClick={handleConfirm}>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                            Confirmar Presença
                        </DropdownMenuItem>
                    )}

                    {canComplete && (
                        <DropdownMenuItem onClick={handleComplete}>
                            <Clock className="mr-2 h-4 w-4 text-blue-600" />
                            Marcar como Concluída
                        </DropdownMenuItem>
                    )}

                    {canMarkNoShow && (
                        <DropdownMenuItem onClick={handleNoShow}>
                            <UserX className="mr-2 h-4 w-4 text-orange-600" />
                            Não Compareceu
                        </DropdownMenuItem>
                    )}

                    {canCancel && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => setCancelDialogOpen(true)}
                                className="text-red-600 focus:text-red-600"
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancelar Agendamento
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar Agendamento</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja cancelar o agendamento com{" "}
                            <strong>{patientName}</strong>? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Label htmlFor="cancel-reason">Motivo do cancelamento (opcional)</Label>
                        <Textarea
                            id="cancel-reason"
                            placeholder="Ex: Paciente solicitou remarcação..."
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            className="mt-2"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>Voltar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancel}
                            disabled={isLoading}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Cancelar Agendamento
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

