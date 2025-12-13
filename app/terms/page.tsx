import { BrainCircuit, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-brand-600">
                        <BrainCircuit size={28} />
                        <span className="font-bold text-xl text-slate-800">PsicoGest</span>
                    </Link>
                    <Link href="/">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 py-12">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Termos de Uso</h1>
                    <p className="text-slate-500 mb-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

                    <div className="prose prose-slate max-w-none">
                        <h2>1. Aceitação dos Termos</h2>
                        <p>
                            Ao acessar e usar o PsicoGest, você concorda com estes Termos de Uso e nossa 
                            Política de Privacidade. Se você não concordar com qualquer parte destes termos, 
                            não poderá usar nossos serviços.
                        </p>

                        <h2>2. Descrição do Serviço</h2>
                        <p>
                            O PsicoGest é uma plataforma de gestão para profissionais de saúde mental que oferece:
                        </p>
                        <ul>
                            <li>Gestão de pacientes e prontuários</li>
                            <li>Agendamento de consultas</li>
                            <li>Integração com Google Calendar</li>
                            <li>Envio de lembretes automáticos</li>
                            <li>Gestão financeira e cobranças</li>
                            <li>Teleconsultas via Google Meet</li>
                        </ul>

                        <h2>3. Cadastro e Conta</h2>
                        <p>
                            Para usar o PsicoGest, você deve criar uma conta fornecendo informações precisas 
                            e atualizadas. Você é responsável por manter a confidencialidade de sua senha e 
                            por todas as atividades que ocorram em sua conta.
                        </p>

                        <h2>4. Uso Aceitável</h2>
                        <p>Você concorda em:</p>
                        <ul>
                            <li>Usar o serviço apenas para fins legais e profissionais</li>
                            <li>Não compartilhar sua conta com terceiros</li>
                            <li>Não tentar acessar dados de outros usuários</li>
                            <li>Manter atualizadas suas informações de cadastro</li>
                            <li>Respeitar a privacidade e os dados de seus pacientes</li>
                        </ul>

                        <h2>5. Proteção de Dados (LGPD)</h2>
                        <p>
                            O PsicoGest está em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018). 
                            Como profissional, você é corresponsável pelo tratamento adequado dos dados de seus pacientes.
                        </p>
                        <p>
                            Garantimos:
                        </p>
                        <ul>
                            <li>Criptografia de dados em trânsito e em repouso</li>
                            <li>Acesso restrito aos seus dados apenas por você</li>
                            <li>Direito de exportar ou excluir seus dados</li>
                            <li>Transparência sobre como seus dados são utilizados</li>
                        </ul>

                        <h2>6. Prontuários e Sigilo Profissional</h2>
                        <p>
                            Os prontuários médicos armazenados no PsicoGest são de responsabilidade exclusiva 
                            do profissional. O sistema oferece recursos de segurança, mas cabe ao profissional 
                            garantir o cumprimento das normas éticas de sua profissão quanto ao sigilo.
                        </p>

                        <h2>7. Integrações</h2>
                        <p>
                            Ao conectar serviços externos (Google, WhatsApp), você autoriza o PsicoGest a 
                            acessar essas plataformas em seu nome. Cada integração tem suas próprias 
                            políticas de privacidade que você deve revisar.
                        </p>

                        <h2>8. Pagamentos</h2>
                        <p>
                            Para funcionalidades premium, o pagamento é processado de forma segura. 
                            Não armazenamos dados completos de cartão de crédito. Cancelamentos e 
                            reembolsos seguem nossa política específica.
                        </p>

                        <h2>9. Limitação de Responsabilidade</h2>
                        <p>
                            O PsicoGest é fornecido "como está". Não nos responsabilizamos por:
                        </p>
                        <ul>
                            <li>Interrupções temporárias do serviço</li>
                            <li>Perdas decorrentes de uso inadequado</li>
                            <li>Decisões clínicas tomadas com base em informações do sistema</li>
                            <li>Falhas em integrações de terceiros (Google, WhatsApp)</li>
                        </ul>

                        <h2>10. Rescisão</h2>
                        <p>
                            Você pode encerrar sua conta a qualquer momento. Podemos suspender ou 
                            encerrar contas que violem estes termos. Após o encerramento, seus dados 
                            serão mantidos pelo prazo legal (prontuários: 20 anos) ou excluídos conforme 
                            sua solicitação.
                        </p>

                        <h2>11. Alterações nos Termos</h2>
                        <p>
                            Podemos atualizar estes termos periodicamente. Notificaremos você sobre 
                            mudanças significativas por email ou através do sistema.
                        </p>

                        <h2>12. Contato</h2>
                        <p>
                            Para dúvidas sobre estes termos ou nossa política de privacidade, entre em 
                            contato pelo email: suporte@psicogest.com.br
                        </p>

                        <hr className="my-8" />

                        <h1 className="text-3xl font-bold text-slate-900 mb-2 mt-12">Política de Privacidade</h1>

                        <h2>Dados que Coletamos</h2>
                        <p>Coletamos os seguintes tipos de dados:</p>
                        <ul>
                            <li><strong>Dados do profissional:</strong> Nome, email, telefone, CRP, endereço</li>
                            <li><strong>Dados dos pacientes:</strong> Informações cadastradas pelo profissional</li>
                            <li><strong>Dados de uso:</strong> Logs de acesso e interações com o sistema</li>
                            <li><strong>Dados de integrações:</strong> Tokens de acesso a serviços conectados</li>
                        </ul>

                        <h2>Como Usamos seus Dados</h2>
                        <ul>
                            <li>Fornecer e melhorar nossos serviços</li>
                            <li>Enviar notificações relacionadas ao serviço</li>
                            <li>Processar pagamentos</li>
                            <li>Garantir a segurança da plataforma</li>
                        </ul>

                        <h2>Compartilhamento de Dados</h2>
                        <p>
                            Não vendemos seus dados. Compartilhamos apenas com:
                        </p>
                        <ul>
                            <li>Provedores de infraestrutura (servidores, banco de dados)</li>
                            <li>Processadores de pagamento</li>
                            <li>Autoridades, quando legalmente exigido</li>
                        </ul>

                        <h2>Seus Direitos (LGPD)</h2>
                        <p>Você tem direito a:</p>
                        <ul>
                            <li>Acessar seus dados</li>
                            <li>Corrigir dados incorretos</li>
                            <li>Solicitar exclusão de dados</li>
                            <li>Exportar seus dados</li>
                            <li>Revogar consentimentos</li>
                        </ul>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 mt-12">
                <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-slate-500">
                    © {new Date().getFullYear()} PsicoGest. Todos os direitos reservados.
                </div>
            </footer>
        </div>
    );
}

