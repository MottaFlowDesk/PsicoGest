"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ArchivePatientButtonProps {
    patientId: string;
    patientName: string;
}

export function ArchivePatientButton({ patientId, patientName }: ArchivePatientButtonProps) {
    const [isArchiving, setIsArchiving] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    async function handleArchive() {
        setIsArchiving(true);
        try {
            const { error } = await supabase
                .from("patients")
                .update({
                    archived: true,
                    archived_at: new Date().toISOString(),
                })
                .eq("id", patientId);

            if (error) throw error;

            router.push("/dashboard/patients");
            router.refresh();
        } catch (error) {
            console.error("Error archiving patient:", error);
            // Toast error here
            setIsArchiving(false);
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 hidden sm:flex">
                    {isArchiving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Archive className="mr-2 h-4 w-4" />
                    )}
                    Arquivar
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Arquivar Paciente</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja arquivar <strong>{patientName}</strong>?
                        <br />
                        O paciente será removido da lista principal, mas você poderá acessá-lo futuramente nos filtros de arquivados.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleArchive();
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        {isArchiving ? "Arquivando..." : "Sim, arquivar"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
