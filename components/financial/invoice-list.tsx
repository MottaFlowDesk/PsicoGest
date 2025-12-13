"use client";

import { useState } from "react";
import { Invoice, markInvoiceAsPaid, cancelInvoice } from "@/app/dashboard/financial/actions";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    MoreHorizontal,
    CheckCircle,
    XCircle,
    Loader2,
    CreditCard,
    Banknote,
    Wallet,
    Link2,
    Copy,
} from "lucide-react";
import { format } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface InvoiceListProps {
    invoices: Invoice[];
}

export function InvoiceList({ invoices }: InvoiceListProps) {
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [payDialogOpen, setPayDialogOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [cancelReason, setCancelReason] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("pix");
    const router = useRouter();

    const formatMoney = (cents: number) =>
        new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(cents / 100);

    const getStatusBadge = (status: string, dueDate: string) => {
        const isOverdue = status === 'pending' && new Date(dueDate) < new Date(new Date().setHours(0, 0, 0, 0));

        if (status === "paid") {
            return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 shadow-none border-green-200">Pago</Badge>;
        }
        if (isOverdue || status === "overdue") {
            return <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 shadow-none border-red-200">Vencido</Badge>;
        }
        if (status === "cancelled") {
            return <Badge variant="secondary">Cancelado</Badge>;
        }
        return <Badge variant="outline" className="text-slate-600 bg-slate-50">Pendente</Badge>;
    };

    const handleMarkAsPaid = async () => {
        if (!selectedInvoice) return;
        
        setLoadingId(selectedInvoice.id);
        try {
            await markInvoiceAsPaid(selectedInvoice.id, paymentMethod);
            toast.success("Fatura marcada como paga!");
            setPayDialogOpen(false);
            setSelectedInvoice(null);
            setPaymentMethod("pix");
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Erro ao marcar fatura como paga");
        } finally {
            setLoadingId(null);
        }
    };

    const handleCancel = async () => {
        if (!selectedInvoice) return;
        
        setLoadingId(selectedInvoice.id);
        try {
            await cancelInvoice(selectedInvoice.id, cancelReason);
            toast.success("Fatura cancelada");
            setCancelDialogOpen(false);
            setSelectedInvoice(null);
            setCancelReason("");
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Erro ao cancelar fatura");
        } finally {
            setLoadingId(null);
        }
    };

    const openPayDialog = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setPayDialogOpen(true);
    };

    const openCancelDialog = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setCancelDialogOpen(true);
    };

    const copyPaymentLink = async (invoiceId: string) => {
        const paymentLink = `${window.location.origin}/pay/${invoiceId}`;
        try {
            await navigator.clipboard.writeText(paymentLink);
            toast.success("Link de pagamento copiado!");
        } catch (error) {
            toast.error("Erro ao copiar link");
        }
    };

    return (
        <>
            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fatura #</TableHead>
                            <TableHead>Paciente</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                    Nenhuma fatura encontrada.
                                </TableCell>
                            </TableRow>
                        ) : (
                            invoices.map((invoice) => {
                                const canPay = invoice.status === "pending";
                                const canCancel = invoice.status === "pending";
                                const isLoading = loadingId === invoice.id;

                                return (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-medium">
                                            {invoice.invoice_number || "Gerando..."}
                                        </TableCell>
                                        <TableCell>{invoice.patient?.full_name || "Desconhecido"}</TableCell>
                                        <TableCell>
                                            {format(new Date(invoice.due_date), "dd/MM/yyyy")}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(invoice.status, invoice.due_date)}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatMoney(invoice.amount_cents)}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button 
                                                        variant="ghost" 
                                                        className="h-8 w-8 p-0"
                                                        disabled={isLoading}
                                                    >
                                                        {isLoading ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                    
                                                    {canPay && (
                                                        <DropdownMenuItem 
                                                            onClick={() => openPayDialog(invoice)}
                                                            className="text-green-600 focus:text-green-600"
                                                        >
                                                            <CheckCircle className="mr-2 h-4 w-4" />
                                                            Marcar como Pago
                                                        </DropdownMenuItem>
                                                    )}
                                                    
                                                    {canPay && (
                                                        <DropdownMenuItem 
                                                            onClick={() => copyPaymentLink(invoice.id)}
                                                        >
                                                            <Link2 className="mr-2 h-4 w-4" />
                                                            Copiar Link de Pagamento
                                                        </DropdownMenuItem>
                                                    )}

                                                    {canCancel && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem 
                                                                onClick={() => openCancelDialog(invoice)}
                                                                className="text-red-600 focus:text-red-600"
                                                            >
                                                                <XCircle className="mr-2 h-4 w-4" />
                                                                Cancelar Fatura
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}

                                                    {!canPay && !canCancel && (
                                                        <DropdownMenuItem disabled>
                                                            Sem ações disponíveis
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Mark as Paid Dialog */}
            <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Registrar Pagamento</DialogTitle>
                        <DialogDescription>
                            Confirme o recebimento da fatura{" "}
                            <strong>{selectedInvoice?.invoice_number}</strong> no valor de{" "}
                            <strong>{selectedInvoice && formatMoney(selectedInvoice.amount_cents)}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="payment-method">Forma de Pagamento</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger className="mt-2">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pix">
                                    <div className="flex items-center gap-2">
                                        <Wallet className="h-4 w-4" />
                                        PIX
                                    </div>
                                </SelectItem>
                                <SelectItem value="credit_card">
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="h-4 w-4" />
                                        Cartão de Crédito
                                    </div>
                                </SelectItem>
                                <SelectItem value="cash">
                                    <div className="flex items-center gap-2">
                                        <Banknote className="h-4 w-4" />
                                        Dinheiro
                                    </div>
                                </SelectItem>
                                <SelectItem value="other">Outro</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setPayDialogOpen(false)}
                            disabled={loadingId !== null}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleMarkAsPaid}
                            disabled={loadingId !== null}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {loadingId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar Pagamento
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancel Dialog */}
            <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar Fatura</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja cancelar a fatura{" "}
                            <strong>{selectedInvoice?.invoice_number}</strong>? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Label htmlFor="cancel-reason">Motivo do cancelamento (opcional)</Label>
                        <Textarea
                            id="cancel-reason"
                            placeholder="Ex: Cliente solicitou cancelamento..."
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            className="mt-2"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loadingId !== null}>Voltar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancel}
                            disabled={loadingId !== null}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {loadingId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Cancelar Fatura
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
