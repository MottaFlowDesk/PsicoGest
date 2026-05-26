"use client";

import { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Archive } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { EditPatientDialog } from "@/components/patients/edit-patient-dialog";

interface PatientActionsMenuProps {
    patient: {
        id: string;
        full_name: string;
        date_of_birth: string;
        phone: string;
        email?: string | null;
        cpf?: string | null;
        occupation?: string | null;
        notes?: string | null;
        address?: {
            zip?: string;
            street?: string;
            number?: string;
            complement?: string;
            neighborhood?: string;
            city?: string;
            state?: string;
        } | null;
    };
    onUpdate?: () => void;
}

export function PatientActionsMenu({ patient, onUpdate }: PatientActionsMenuProps) {
    const [editOpen, setEditOpen] = useState(false);
    const supabase = createClient();

    const handleArchive = async () => {
        if (!confirm(`Tem certeza que deseja arquivar ${patient.full_name}?`)) {
            return;
        }

        const { error } = await supabase
            .from("patients")
            .update({ archived: true })
            .eq("id", patient.id);

        if (error) {
            toast.error("Erro ao arquivar paciente");
            console.error(error);
        } else {
            toast.success("Paciente arquivado com sucesso");
            if (onUpdate) onUpdate();
        }
    };

    const handleDelete = async () => {
        if (!confirm(`ATENÇÃO: Tem certeza que deseja EXCLUIR permanentemente ${patient.full_name}? Esta ação não pode ser desfeita.`)) {
            return;
        }

        const { error } = await supabase
            .from("patients")
            .delete()
            .eq("id", patient.id);

        if (error) {
            toast.error("Erro ao excluir paciente");
            console.error(error);
        } else {
            toast.success("Paciente excluído com sucesso");
            if (onUpdate) onUpdate();
        }
    };

    return (
        <>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded hover:bg-slate-100">
                    <MoreHorizontal size={18} />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onSelect={(e) => {
                        e.preventDefault();
                        setEditOpen(true);
                    }}
                    className="cursor-pointer"
                >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleArchive} className="cursor-pointer">
                    <Archive className="mr-2 h-4 w-4" />
                    Arquivar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={handleDelete}
                    className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
        <EditPatientDialog
            patient={patient}
            trigger={null}
            open={editOpen}
            onOpenChange={setEditOpen}
            onSuccess={onUpdate}
        />
        </>
    );
}
