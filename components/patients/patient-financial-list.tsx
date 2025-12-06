"use client";

import { useState } from "react";
import { Invoice, createManualInvoice } from "@/app/dashboard/financial/actions";
import { InvoiceList } from "@/components/financial/invoice-list";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface PatientFinancialProps {
    patientId: string;
    invoices: Invoice[];
}

export function PatientFinancialList({ patientId, invoices }: PatientFinancialProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const [formData, setFormData] = useState({
        description: "",
        amount: "",
        dueDate: new Date().toISOString().split('T')[0],
    });

    const handleCreate = async () => {
        setIsLoading(true);
        try {
            if (!formData.description || !formData.amount) {
                alert("Preencha todos os campos");
                setIsLoading(false);
                return;
            }

            await createManualInvoice({
                patientId,
                description: formData.description,
                amount: parseFloat(formData.amount.replace(',', '.')),
                dueDate: formData.dueDate,
            });

            toast({
                title: "Fatura criada",
                description: "A fatura foi gerada com sucesso.",
                variant: "default",
            });
            setIsOpen(false);
            setFormData({
                description: "",
                amount: "",
                dueDate: new Date().toISOString().split('T')[0],
            });
            router.refresh();
        } catch (error) {
            toast({
                title: "Erro",
                description: "Erro ao criar fatura.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-slate-900">Faturas e Pagamentos</h3>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-brand-600 hover:bg-brand-700">
                            <Plus className="mr-2 h-4 w-4" />
                            Nova Fatura
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Nova Fatura Manual</DialogTitle>
                            <DialogDescription>
                                Lançar uma nova fatura avulsa para este paciente.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="desc" className="text-right">
                                    Descrição
                                </Label>
                                <Input
                                    id="desc"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Ex: Sessão Terapia"
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="amount" className="text-right">
                                    Valor (R$)
                                </Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="date" className="text-right">
                                    Vencimento
                                </Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate} disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Criar Fatura
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <InvoiceList invoices={invoices} />
        </div>
    );
}
