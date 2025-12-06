"use client";

import { Invoice } from "@/app/dashboard/financial/actions";
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
import { MoreHorizontal, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InvoiceListProps {
    invoices: Invoice[];
}

export function InvoiceList({ invoices }: InvoiceListProps) {
    const formatMoney = (cents: number) =>
        new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(cents / 100);

    const getStatusBadge = (status: string, dueDate: string) => {
        // Check overdue manually if status is pending but date passed
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

    return (
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
                        invoices.map((invoice) => (
                            <TableRow key={invoice.id}>
                                <TableCell className="font-medium">{invoice.invoice_number || "Gerando..."}</TableCell>
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
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                            <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
                                            <DropdownMenuItem>Baixar PDF</DropdownMenuItem>
                                            {invoice.status === 'pending' && (
                                                <DropdownMenuItem className="text-green-600">Marcar como Pago</DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
