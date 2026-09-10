"use client";

import { useState } from "react";
import { Invoice, markInvoiceAsPaid, cancelInvoice, reopenInvoice } from "@/app/dashboard/financial/actions";
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
    Eye,
    RotateCcw,
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
    onUpdate?: () => void;
}

/** Status exibido ao usuário: uma fatura pendente com vencimento passado é "vencida". */
type EffectiveStatus = "paid" | "pending" | "overdue" | "cancelled";

export function getEffectiveStatus(invoice: Pick<Invoice, "status" | "due_date">): EffectiveStatus {
    if (invoice.status === "paid") return "paid";
    if (invoice.status === "cancelled") return "cancelled";
    if (invoice.status === "overdue") return "overdue";

    const hoje = format(new Date(), "yyyy-MM-dd");
    return invoice.due_date < hoje ? "overdue" : "pending";
}

const STATUS_BADGE: Record<EffectiveStatus, { label: string; className: string }> = {
    paid: { label: "Pago", className: "border-transparent bg-green-600 text-white hover:bg-green-600" },
    pending: { label: "Pendente", className: "border-transparent bg-blue-600 text-white hover:bg-blue-600" },
    overdue: { label: "Vencido", className: "border-transparent bg-orange-500 text-white hover:bg-orange-500" },
    cancelled: { label: "Cancelado", className: "border-transparent bg-red-600 text-white hover:bg-red-600" },
};

function formatDate(value: string) {
    const [year, month, day] = value.slice(0, 10).split("-");
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
    pix: "PIX",
    credit_card: "Cartão de Crédito",
    cash: "Dinheiro",
    other: "Outro",
};

export function InvoiceList({ invoices, onUpdate }: InvoiceListProps) {
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [payDialogOpen, setPayDialogOpen] = useState(false);
    const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [cancelReason, setCancelReason] = useState("");
    const [reopenReason, setReopenReason] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("pix");
    const router = useRouter();

    const formatMoney = (cents: number) =>
        new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(cents / 100);

    const getStatusBadge = (invoice: Pick<Invoice, "status" | "due_date">) => {
        const { label, className } = STATUS_BADGE[getEffectiveStatus(invoice)];
        return <Badge variant="outline" className={`shadow-none ${className}`}>{label}</Badge>;
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
            onUpdate?.();
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
            onUpdate?.();
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Erro ao cancelar fatura");
        } finally {
            setLoadingId(null);
        }
    };

    const handleReopen = async () => {
        if (!selectedInvoice) return;

        setLoadingId(selectedInvoice.id);
        try {
            await reopenInvoice(selectedInvoice.id, reopenReason);
            toast.success("Fatura reaberta como pendente");
            setReopenDialogOpen(false);
            setSelectedInvoice(null);
            setReopenReason("");
            onUpdate?.();
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Erro ao reabrir fatura");
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

    const openReopenDialog = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setReopenDialogOpen(true);
    };

    const openDetails = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setDetailsOpen(true);
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
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead>Fatura #</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="w-[1%] text-right">Ações</TableHead>
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
                            // Vencida ainda é uma fatura em aberto: pode ser paga, cobrada e cancelada
                            const emAberto = ["pending", "overdue"].includes(getEffectiveStatus(invoice));
                            const canPay = emAberto;
                            const canCancel = emAberto;
                            const canReopen = invoice.status === "paid";
                            const isLoading = loadingId === invoice.id;

                            return (
                                <TableRow key={invoice.id}>
                                    <TableCell className="font-medium">
                                        {invoice.invoice_number || "Gerando..."}
                                    </TableCell>
                                    <TableCell>{invoice.patient?.full_name || "Desconhecido"}</TableCell>
                                    <TableCell>
                                        {formatDate(invoice.due_date)}
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(invoice)}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {formatMoney(invoice.amount_cents)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-slate-700"
                                                title="Ver detalhes"
                                                onClick={() => openDetails(invoice)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            {canPay && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-green-600"
                                                    title="Marcar como pago"
                                                    disabled={isLoading}
                                                    onClick={() => openPayDialog(invoice)}
                                                >
                                                    <CheckCircle className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-slate-700"
                                                        disabled={isLoading}
                                                        title="Mais ações"
                                                    >
                                                        {isLoading ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-56">
                                                    <DropdownMenuLabel>Ações</DropdownMenuLabel>

                                                    <DropdownMenuItem onClick={() => openDetails(invoice)}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        Ver Detalhes
                                                    </DropdownMenuItem>

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

                                                    {canReopen && (
                                                        <DropdownMenuItem
                                                            onClick={() => openReopenDialog(invoice)}
                                                            className="text-orange-600 focus:text-orange-600"
                                                        >
                                                            <RotateCcw className="mr-2 h-4 w-4" />
                                                            Reabrir Fatura
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
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>

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

            {/* Reopen Dialog */}
            <AlertDialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reabrir Fatura</AlertDialogTitle>
                        <AlertDialogDescription>
                            A fatura <strong>{selectedInvoice?.invoice_number}</strong> voltará para
                            pendente e o pagamento registrado será desfeito. Use isso quando o
                            pagamento tiver sido lançado por engano ou estornado.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Label htmlFor="reopen-reason">Motivo (opcional)</Label>
                        <Textarea
                            id="reopen-reason"
                            placeholder="Ex: pagamento estornado pelo banco..."
                            value={reopenReason}
                            onChange={(e) => setReopenReason(e.target.value)}
                            className="mt-2"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loadingId !== null}>Voltar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleReopen}
                            disabled={loadingId !== null}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            {loadingId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Reabrir Fatura
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Details Dialog */}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            {selectedInvoice?.invoice_number}
                            {selectedInvoice && getStatusBadge(selectedInvoice)}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedInvoice?.patient?.full_name || "Paciente desconhecido"}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedInvoice && (
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 py-2 text-sm">
                            <div>
                                <dt className="text-slate-500">Valor</dt>
                                <dd className="font-semibold text-slate-900">
                                    {formatMoney(selectedInvoice.amount_cents)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">Vencimento</dt>
                                <dd className="text-slate-900">
                                    {formatDate(selectedInvoice.due_date)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">Emissão</dt>
                                <dd className="text-slate-900">
                                    {formatDate(selectedInvoice.issue_date)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">Pagamento</dt>
                                <dd className="text-slate-900">
                                    {selectedInvoice.paid_at
                                        ? `${formatDate(selectedInvoice.paid_at)}${
                                              selectedInvoice.payment_method
                                                  ? ` · ${PAYMENT_METHOD_LABEL[selectedInvoice.payment_method] ?? selectedInvoice.payment_method}`
                                                  : ""
                                          }`
                                        : "Não recebido"}
                                </dd>
                            </div>
                            <div className="col-span-2">
                                <dt className="text-slate-500">Descrição</dt>
                                <dd className="text-slate-900">
                                    {selectedInvoice.description || "—"}
                                </dd>
                            </div>
                            {selectedInvoice.notes && (
                                <div className="col-span-2">
                                    <dt className="text-slate-500">Histórico</dt>
                                    <dd className="whitespace-pre-line text-slate-900">
                                        {selectedInvoice.notes}
                                    </dd>
                                </div>
                            )}
                        </dl>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
