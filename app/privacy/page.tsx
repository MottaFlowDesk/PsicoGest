import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import { LEGAL } from "@/lib/legal/site";

export const metadata: Metadata = {
    title: "Política de Privacidade | PsicoGuest",
    description:
        "Política de Privacidade do PsicoGuest. Saiba como tratamos dados pessoais, integrações Google, WhatsApp (Meta) e Stripe em conformidade com a LGPD.",
};

export default function PrivacyPage() {
    return (
        <LegalPageLayout title="Política de Privacidade">
            <p className="lead text-lg text-slate-700">
                O {LEGAL.appName} está comprometido com a proteção da privacidade e
                dos dados pessoais de profissionais de saúde mental e dos pacientes
                cadastrados na plataforma. Esta Política descreve como coletamos,
                usamos, armazenamos, compartilhamos e protegemos informações.
            </p>

            <h2>1. Quem somos</h2>
            <p>
                O {LEGAL.appName} é uma plataforma de gestão para psicólogos e
                profissionais de saúde mental, oferecendo recursos de agenda,
                prontuário, comunicações com pacientes, integrações e gestão
                financeira.
            </p>
            <p>
                Para questões sobre privacidade e proteção de dados, entre em
                contato: <strong>{LEGAL.supportEmail}</strong> ou{" "}
                <strong>{LEGAL.dpoEmail}</strong> (Encarregado de Proteção de
                Dados).
            </p>

            <h2>2. Dados que coletamos</h2>

            <h3>2.1 Dados do profissional (titular da conta)</h3>
            <ul>
                <li>Nome completo, e-mail e telefone</li>
                <li>Número de registro profissional (ex.: CRP)</li>
                <li>Endereço, especialidade e dados de perfil</li>
                <li>Foto de perfil (opcional)</li>
                <li>Dados de assinatura e faturamento</li>
            </ul>

            <h3>2.2 Dados de pacientes (inseridos pelo profissional)</h3>
            <ul>
                <li>Identificação, contato e dados demográficos</li>
                <li>Prontuários, anotações clínicas e histórico de sessões</li>
                <li>Documentos e arquivos enviados</li>
                <li>Informações de agendamentos e confirmações</li>
            </ul>
            <p>
                <strong>Importante:</strong> o profissional é responsável pelo
                tratamento lícito dos dados de seus pacientes, incluindo base
                legal, consentimento quando aplicável e observância das normas
                éticas e legais da profissão.
            </p>

            <h3>2.3 Dados de uso e técnicos</h3>
            <ul>
                <li>Logs de acesso, data/hora de ações e endereço IP</li>
                <li>Tipo de navegador, dispositivo e sistema operacional</li>
                <li>Cookies e tokens de sessão necessários ao funcionamento</li>
            </ul>

            <h3>2.4 Dados de integrações (com seu consentimento)</h3>
            <ul>
                <li>
                    <strong>Google (Calendar e Gmail):</strong> tokens OAuth de
                    acesso e refresh, e-mail da conta Google conectada, IDs de
                    eventos do calendário e links de reunião (Google Meet)
                </li>
                <li>
                    <strong>WhatsApp Business Platform (Meta):</strong>{" "}
                    telefone do paciente em formato internacional, data da
                    autorização de contato, identificador da mensagem e status
                    de entrega; não armazenamos conversas
                </li>
                <li>
                    <strong>Stripe:</strong> identificadores de cliente,
                    assinatura e pagamentos; dados de cartão são processados
                    diretamente pelo Stripe
                </li>
            </ul>

            <h2>3. Como usamos os dados</h2>
            <ul>
                <li>Fornecer e operar os serviços contratados</li>
                <li>Gerenciar agendamentos, confirmações e lembretes</li>
                <li>Sincronizar eventos com Google Calendar e enviar e-mails via Gmail</li>
                <li>
                    Enviar confirmações e lembretes por WhatsApp aos pacientes
                    que autorizaram esse contato
                </li>
                <li>Processar assinaturas e pagamentos</li>
                <li>Garantir segurança, prevenir fraudes e cumprir obrigações legais</li>
                <li>Melhorar a estabilidade e a experiência do produto</li>
            </ul>
            <p>
                <strong>Não vendemos</strong> seus dados pessoais nem os dados
                inseridos por você na plataforma.
            </p>

            <h2>4. Uso dos dados do Google (Google API Services)</h2>
            <p>
                Quando você conecta sua conta Google, o {LEGAL.appName} acessa
                apenas os escopos autorizados por você, incluindo:
            </p>
            <ul>
                <li>Leitura e escrita no Google Calendar (criar e sincronizar eventos)</li>
                <li>Envio de e-mails pelo Gmail em seu nome (confirmações e lembretes)</li>
                <li>Identificação do e-mail da conta Google conectada</li>
                <li>Criação de links do Google Meet para teleconsultas</li>
            </ul>
            <p>
                O uso e a transferência de informações recebidas das APIs do
                Google pelo {LEGAL.appName} obedecem à{" "}
                <a
                    href="https://developers.google.com/terms/api-services-user-data-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Google API Services User Data Policy
                </a>
                , incluindo os requisitos de <strong>Limited Use</strong>.
            </p>
            <p>Em particular:</p>
            <ul>
                <li>
                    Utilizamos dados do Google apenas para fornecer funcionalidades
                    visíveis ao usuário descritas nesta política
                </li>
                <li>
                    Não utilizamos dados do Google para publicidade, revenda ou
                    perfilamento não relacionado ao serviço
                </li>
                <li>
                    Não transferimos dados do Google a terceiros, exceto conforme
                    necessário para operar o serviço (infraestrutura), cumprir a
                    lei ou com seu consentimento explícito
                </li>
                <li>
                    Você pode revogar o acesso a qualquer momento em{" "}
                    <strong>Configurações → Integrações</strong> no {LEGAL.appName}{" "}
                    ou na{" "}
                    <a
                        href="https://myaccount.google.com/permissions"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        página de permissões da sua Conta Google
                    </a>
                </li>
            </ul>

            <h2>5. Compartilhamento com terceiros</h2>
            <p>Compartilhamos dados apenas com operadores necessários ao serviço:</p>
            <ul>
                <li>
                    <strong>Supabase:</strong> banco de dados, autenticação e
                    armazenamento
                </li>
                <li>
                    <strong>Vercel:</strong> hospedagem da aplicação
                </li>
                <li>
                    <strong>Google:</strong> Calendar, Gmail e Meet (mediante
                    autorização OAuth)
                </li>
                <li>
                    <strong>Stripe:</strong> processamento de pagamentos
                </li>
                <li>
                    <strong>Meta Platforms (WhatsApp Business Platform):</strong>{" "}
                    envio de confirmações e lembretes pelo número oficial do{" "}
                    {LEGAL.appName}, somente para pacientes que autorizaram o
                    contato por WhatsApp
                </li>
            </ul>
            <p>
                Também podemos divulgar dados quando exigido por lei, ordem judicial
                ou autoridade competente.
            </p>

            <h2>6. Segurança</h2>
            <p>Adotamos medidas técnicas e organizacionais, incluindo:</p>
            <ul>
                <li>Criptografia em trânsito (HTTPS/TLS)</li>
                <li>Controle de acesso por usuário (Row Level Security no banco)</li>
                <li>Autenticação segura e tokens com escopo limitado</li>
                <li>Backups e monitoramento de infraestrutura</li>
            </ul>
            <p>
                Nenhum sistema é 100% seguro. Em caso de incidente relevante,
                notificaremos conforme exigido pela LGPD.
            </p>

            <h2>7. Retenção de dados</h2>
            <p>Mantemos dados pelo tempo necessário para:</p>
            <ul>
                <li>Prestar o serviço enquanto a conta estiver ativa</li>
                <li>Cumprir obrigações legais e regulatórias</li>
                <li>Resolver disputas e fazer cumprir contratos</li>
            </ul>
            <p>
                Prontuários e registros clínicos podem estar sujeitos a prazos
                legais mínimos de guarda (ex.: 20 anos). Após encerramento da
                conta, dados serão excluídos ou anonimizados quando permitido,
                respeitando esses prazos.
            </p>

            <h2>8. Seus direitos (LGPD)</h2>
            <p>Conforme a Lei nº 13.709/2018 (LGPD), você pode solicitar:</p>
            <ul>
                <li>Confirmação e acesso aos dados</li>
                <li>Correção de dados incompletos ou desatualizados</li>
                <li>Anonimização, bloqueio ou eliminação de dados desnecessários</li>
                <li>Portabilidade dos dados</li>
                <li>Revogação de consentimento</li>
                <li>Informação sobre compartilhamentos</li>
            </ul>
            <p>
                Envie solicitações para <strong>{LEGAL.supportEmail}</strong>.
                Responderemos em até 15 dias úteis, salvo prorrogação legal.
            </p>

            <h2>9. Cookies</h2>
            <p>
                Utilizamos cookies e armazenamento local essenciais para manter sua
                sessão autenticada e preferências básicas. Você pode gerenciar
                cookies no navegador, mas partes do serviço podem deixar de
                funcionar corretamente.
            </p>

            <h2>10. Transferência internacional</h2>
            <p>
                Alguns provedores podem processar dados fora do Brasil. Nesses
                casos, adotamos salvaguardas compatíveis com a LGPD e contratos
                com operadores que garantem proteção adequada.
            </p>
            <p>
                É o caso do envio de mensagens por WhatsApp: o telefone do
                paciente é transmitido à Meta Platforms, sediada nos Estados
                Unidos, exclusivamente para entregar a confirmação ou o
                lembrete. Esse envio só ocorre com autorização registrada no
                cadastro do paciente e pode ser revogado a qualquer momento,
                desligando a autorização de contato por WhatsApp.
            </p>

            <h2>11. Menores de idade</h2>
            <p>
                O {LEGAL.appName} destina-se a profissionais maiores de 18 anos.
                Dados de menores inseridos em prontuários são tratados pelo
                profissional responsável, conforme a legislação aplicável.
            </p>

            <h2>12. Alterações desta Política</h2>
            <p>
                Podemos atualizar esta Política periodicamente. Mudanças
                relevantes serão comunicadas por e-mail ou aviso no sistema. A
                data no topo indica a versão vigente.
            </p>

            <h2>13. Contato</h2>
            <ul>
                <li>
                    <strong>Suporte:</strong> {LEGAL.supportEmail}
                </li>
                <li>
                    <strong>Encarregado (DPO):</strong> {LEGAL.dpoEmail}
                </li>
                <li>
                    <strong>Termos de Serviço:</strong>{" "}
                    <Link href="/terms">/terms</Link>
                </li>
            </ul>

            <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200 not-prose">
                <p className="text-sm text-slate-600">
                    Esta política está em conformidade com a LGPD (Lei
                    13.709/2018) e com os requisitos de privacidade das
                    integrações Google utilizadas pelo {LEGAL.appName}.
                </p>
            </div>
        </LegalPageLayout>
    );
}
