import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

export default function PaymentSuccessPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl text-green-600">Pagamento Confirmado!</CardTitle>
                    <CardDescription>
                        Seu pagamento foi processado com sucesso. Você receberá um comprovante por email.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-slate-500">
                        Obrigado por utilizar o PsicoGuest para seus pagamentos.
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

