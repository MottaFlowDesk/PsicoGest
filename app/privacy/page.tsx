import { BrainCircuit, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
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
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Política de Privacidade</h1>
                    <p className="text-slate-500 mb-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

                    <div className="prose prose-slate max-w-none">
                        <p className="lead">
                            O PsicoGest está comprometido com a proteção da privacidade e dos dados pessoais de nossos usuários. 
                            Esta política descreve como coletamos, usamos, armazenamos e protegemos suas informações.
                        </p>

                        <h2>1. Informações que Coletamos</h2>
                        
                        <h3>1.1 Dados do Profissional</h3>
                        <p>Quando você cria uma conta no PsicoGest, coletamos:</p>
                        <ul>
                            <li>Nome completo</li>
                            <li>Endereço de email</li>
                            <li>Número de telefone</li>
                            <li>Número de registro profissional (CRP/CRM)</li>
                            <li>Endereço completo</li>
                            <li>Especialidade profissional</li>
                            <li>Foto de perfil (opcional)</li>
                        </ul>

                        <h3>1.2 Dados dos Pacientes</h3>
                        <p>Como profissional, você pode cadastrar informações de seus pacientes:</p>
                        <ul>
                            <li>Nome completo</li>
                            <li>Data de nascimento</li>
                            <li>CPF</li>
                            <li>Telefone e email</li>
                            <li>Endereço</li>
                            <li>Informações de contato de emergência</li>
                            <li>Prontuários e anotações clínicas</li>
                            <li>Documentos e exames</li>
                        </ul>
                        <p className="text-sm text-slate-600 italic">
                            <strong>Importante:</strong> Você é o responsável pelo tratamento adequado dos dados de seus pacientes 
                            conforme a LGPD e as normas éticas de sua profissão.
                        </p>

                        <h3>1.3 Dados de Uso</h3>
                        <p>Coletamos automaticamente:</p>
                        <ul>
                            <li>Logs de acesso e interações com o sistema</li>
                            <li>Endereço IP</li>
                            <li>Informações do dispositivo e navegador</li>
                            <li>Data e hora das ações</li>
                        </ul>

                        <h3>1.4 Dados de Integrações</h3>
                        <p>Ao conectar serviços externos, armazenamos:</p>
                        <ul>
                            <li><strong>Google Calendar:</strong> Tokens de acesso OAuth para sincronizar agendamentos</li>
                            <li><strong>Gmail:</strong> Tokens de acesso para envio de emails</li>
                            <li><strong>WhatsApp:</strong> Informações de conexão (não armazenamos mensagens)</li>
                            <li><strong>Stripe:</strong> ID da conta conectada (não armazenamos dados de cartão)</li>
                        </ul>

                        <h2>2. Como Usamos suas Informações</h2>
                        <p>Utilizamos seus dados para:</p>
                        <ul>
                            <li><strong>Fornecer serviços:</strong> Gestão de pacientes, agendamentos, prontuários e financeiro</li>
                            <li><strong>Enviar notificações:</strong> Lembretes de consultas, confirmações e atualizações do sistema</li>
                            <li><strong>Processar pagamentos:</strong> Cobrança de assinaturas e processamento de pagamentos de pacientes</li>
                            <li><strong>Melhorar o serviço:</strong> Análise de uso para melhorar funcionalidades</li>
                            <li><strong>Garantir segurança:</strong> Detecção de fraudes e atividades suspeitas</li>
                            <li><strong>Cumprir obrigações legais:</strong> Conformidade com leis e regulamentações</li>
                        </ul>

                        <h2>3. Compartilhamento de Informações</h2>
                        <p>Não vendemos seus dados pessoais. Compartilhamos informações apenas nas seguintes situações:</p>

                        <h3>3.1 Provedores de Serviços</h3>
                        <p>Compartilhamos dados com terceiros que nos ajudam a operar o serviço:</p>
                        <ul>
                            <li><strong>Supabase:</strong> Hospedagem de banco de dados e autenticação</li>
                            <li><strong>Vercel:</strong> Hospedagem da aplicação</li>
                            <li><strong>Stripe:</strong> Processamento de pagamentos</li>
                            <li><strong>Google:</strong> Integração com Calendar e Gmail (apenas com sua autorização)</li>
                            <li><strong>Evolution API (Railway):</strong> Serviço de WhatsApp</li>
                        </ul>

                        <h3>3.2 Obrigações Legais</h3>
                        <p>Podemos divulgar informações quando exigido por lei, ordem judicial ou processo legal.</p>

                        <h3>3.3 Com seu Consentimento</h3>
                        <p>Compartilhamos informações quando você autoriza explicitamente.</p>

                        <h2>4. Integrações com Serviços de Terceiros</h2>
                        
                        <h3>4.1 Google Services</h3>
                        <p>
                            Ao conectar sua conta Google, você autoriza o PsicoGest a:
                        </p>
                        <ul>
                            <li>Acessar seu Google Calendar para criar e sincronizar eventos</li>
                            <li>Enviar emails através do Gmail em seu nome</li>
                            <li>Criar links de Google Meet para teleconsultas</li>
                        </ul>
                        <p>
                            Esses dados são gerenciados de acordo com a 
                            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                                Política de Privacidade do Google
                            </a>. 
                            Você pode revogar o acesso a qualquer momento nas configurações do Google.
                        </p>

                        <h3>4.2 WhatsApp</h3>
                        <p>
                            Usamos o WhatsApp para enviar lembretes de consultas. Não armazenamos o conteúdo das mensagens, 
                            apenas registramos que o lembrete foi enviado.
                        </p>

                        <h3>4.3 Stripe</h3>
                        <p>
                            Para processar pagamentos, compartilhamos informações necessárias com o Stripe. 
                            Dados de cartão de crédito são processados diretamente pelo Stripe e nunca são armazenados em nossos servidores.
                        </p>

                        <h2>5. Segurança dos Dados</h2>
                        <p>Implementamos medidas de segurança para proteger seus dados:</p>
                        <ul>
                            <li><strong>Criptografia:</strong> Dados em trânsito (HTTPS) e em repouso</li>
                            <li><strong>Autenticação:</strong> Senhas criptografadas e autenticação de dois fatores (quando disponível)</li>
                            <li><strong>Controle de acesso:</strong> Row Level Security (RLS) no banco de dados</li>
                            <li><strong>Backups:</strong> Cópias de segurança regulares</li>
                            <li><strong>Monitoramento:</strong> Sistemas de detecção de intrusão e atividades suspeitas</li>
                            <li><strong>Atualizações:</strong> Manutenção regular de segurança</li>
                        </ul>

                        <h2>6. Seus Direitos (LGPD)</h2>
                        <p>Conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem direito a:</p>
                        <ul>
                            <li><strong>Acesso:</strong> Solicitar uma cópia dos dados que temos sobre você</li>
                            <li><strong>Correção:</strong> Atualizar ou corrigir dados incorretos</li>
                            <li><strong>Exclusão:</strong> Solicitar a exclusão de seus dados (respeitando prazos legais para prontuários)</li>
                            <li><strong>Portabilidade:</strong> Exportar seus dados em formato estruturado</li>
                            <li><strong>Revogação:</strong> Revogar consentimentos dados anteriormente</li>
                            <li><strong>Oposição:</strong> Opor-se ao tratamento de dados em certas circunstâncias</li>
                            <li><strong>Informação:</strong> Ser informado sobre como seus dados são tratados</li>
                        </ul>
                        <p>
                            Para exercer seus direitos, entre em contato: <strong>suporte@psicogest.com.br</strong>
                        </p>

                        <h2>7. Retenção de Dados</h2>
                        <p>Mantemos seus dados pelo tempo necessário para:</p>
                        <ul>
                            <li>Fornecer os serviços contratados</li>
                            <li>Cumprir obrigações legais (prontuários médicos: mínimo de 20 anos)</li>
                            <li>Resolver disputas e fazer cumprir acordos</li>
                        </ul>
                        <p>
                            Após o encerramento da conta, seus dados serão mantidos conforme exigências legais ou excluídos 
                            conforme sua solicitação, respeitando os prazos legais.
                        </p>

                        <h2>8. Cookies e Tecnologias Similares</h2>
                        <p>
                            Utilizamos cookies e tecnologias similares para:
                        </p>
                        <ul>
                            <li>Manter sua sessão ativa</li>
                            <li>Lembrar suas preferências</li>
                            <li>Analisar o uso do serviço</li>
                        </ul>
                        <p>
                            Você pode gerenciar cookies nas configurações do seu navegador, mas isso pode afetar 
                            a funcionalidade do serviço.
                        </p>

                        <h2>9. Privacidade de Menores</h2>
                        <p>
                            O PsicoGest não é destinado a menores de 18 anos. Não coletamos intencionalmente dados de menores. 
                            Se você é responsável por um menor e acredita que ele forneceu dados, entre em contato conosco.
                        </p>

                        <h2>10. Transferência Internacional de Dados</h2>
                        <p>
                            Seus dados podem ser processados e armazenados em servidores localizados fora do Brasil. 
                            Garantimos que esses provedores adotam medidas de segurança adequadas e estão em conformidade 
                            com a LGPD.
                        </p>

                        <h2>11. Alterações nesta Política</h2>
                        <p>
                            Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre 
                            mudanças significativas por email ou através de aviso no sistema. A data de "Última atualização" 
                            no topo desta página indica quando a política foi revisada pela última vez.
                        </p>

                        <h2>12. Contato</h2>
                        <p>
                            Para questões sobre privacidade, proteção de dados ou para exercer seus direitos, entre em contato:
                        </p>
                        <ul>
                            <li><strong>Email:</strong> suporte@psicogest.com.br</li>
                            <li><strong>Assunto:</strong> Privacidade / LGPD</li>
                        </ul>
                        <p>
                            Responderemos sua solicitação no prazo de até 15 dias úteis, conforme previsto na LGPD.
                        </p>

                        <hr className="my-8" />

                        <h2>13. Encarregado de Proteção de Dados (DPO)</h2>
                        <p>
                            Para questões específicas sobre proteção de dados, você pode entrar em contato com nosso 
                            Encarregado de Proteção de Dados através do email: <strong>dpo@psicogest.com.br</strong>
                        </p>

                        <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <p className="text-sm text-slate-600">
                                <strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR', { 
                                    day: 'numeric', 
                                    month: 'long', 
                                    year: 'numeric' 
                                })}
                            </p>
                            <p className="text-sm text-slate-600 mt-2">
                                Esta política está em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018) 
                                e outras legislações aplicáveis.
                            </p>
                        </div>
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


