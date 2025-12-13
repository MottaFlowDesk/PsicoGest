import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import Link from "next/link";

export default function PaymentCancelledPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
                        <XCircle className="h-8 w-8 text-slate-500" />
                    </div>
                    <CardTitle className="text-2xl">Pagamento Cancelado</CardTitle>
                    <CardDescription>
                        O pagamento foi cancelado. Nenhum valor foi cobrado.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-slate-500">
                        Se você teve algum problema, entre em contato com o profissional responsável.
                    </p>
                    <Button asChild variant="outline" className="w-full">
                        <Link href="/">
                            Voltar ao Início
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

