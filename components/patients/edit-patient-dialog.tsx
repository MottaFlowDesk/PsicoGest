"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Edit } from "lucide-react";
import { PatientForm } from "./patient-form";

interface EditPatientDialogProps {
    patient: {
        id: string;
        full_name: string;
        date_of_birth: string;
        phone: string;
        email?: string | null;
        cpf?: string | null;
        occupation?: string | null;
        notes?: string | null;
        avatar_url?: string | null;
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
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
}

export function EditPatientDialog({
    patient,
    trigger,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    onSuccess,
}: EditPatientDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

    const handleSuccess = () => {
        setOpen(false);
        onSuccess?.();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger !== null && (
                <DialogTrigger asChild>
                    {trigger || (
                        <Button variant="outline" size="sm" className="hidden sm:flex">
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                        </Button>
                    )}
                </DialogTrigger>
            )}
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Paciente</DialogTitle>
                    <DialogDescription>
                        Atualize as informações do paciente abaixo.
                    </DialogDescription>
                </DialogHeader>
                <PatientForm 
                    mode="edit" 
                    initialData={patient} 
                    onSuccess={handleSuccess} 
                />
            </DialogContent>
        </Dialog>
    );
}

