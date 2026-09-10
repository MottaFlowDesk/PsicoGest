import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import { LEGAL } from "@/lib/legal/site";

export const metadata: Metadata = {
    title: "Termos de Serviço | PsicoGuest",
    description:
        "Termos de Serviço do PsicoGuest. Condições de uso da plataforma de gestão para profissionais de saúde mental.",
};

export default function TermsPage() {
    return (
        <LegalPageLayout title="Termos de Serviço">
            <p className="lead text-lg text-slate-700">
                Estes Termos de Serviço (&quot;Termos&quot;) regulam o uso da
                plataforma {LEGAL.appName}. Ao criar uma conta ou utilizar o
                serviço, você declara ter lido, compreendido e concordado com
                estes Termos e com a nossa{" "}
                <Link href="/privacy">Política de Privacidade</Link>.
            </p>

            <h2>1. Definições</h2>
            <ul>
                <li>
                    <strong>Plataforma:</strong> sistema {LEGAL.appName} e seus
                    recursos online
                </li>
                <li>
                    <strong>Usuário / Profissional:</strong> pessoa física
                    cadastrada que utiliza a plataforma para gestão do consultório
                </li>
                <li>
                    <strong>Paciente:</strong> pessoa cujos dados são cadastrados
                    pelo profissional na plataforma
                </li>
                <li>
                    <strong>Serviços:</strong> funcionalidades oferecidas pelo{" "}
                    {LEGAL.appName}, incluindo agenda, prontuário, integrações e
                    financeiro
                </li>
            </ul>

            <h2>2. Objeto do serviço</h2>
            <p>
                O {LEGAL.appName} é uma ferramenta de apoio à gestão administrativa
                e clínica de consultórios de saúde mental. O serviço inclui, entre
                outros:
            </p>
            <ul>
                <li>Cadastro e gestão de pacientes</li>
                <li>Prontuário eletrônico e histórico de sessões</li>
                <li>Agenda, confirmações e lembretes (e-mail e WhatsApp)</li>
                <li>Integração com Google Calendar, Gmail e Google Meet</li>
                <li>Gestão financeira e cobranças (conforme plano contratado)</li>
                <li>Notificações in-app</li>
            </ul>
            <p>
                O {LEGAL.appName} <strong>não substitui</strong> o julgamento
                clínico do profissional, não realiza diagnósticos e não presta
                atendimento direto ao paciente.
            </p>

            <h2>3. Elegibilidade e cadastro</h2>
            <p>Para utilizar a plataforma, você deve:</p>
            <ul>
                <li>Ter 18 anos ou mais</li>
                <li>Ser profissional habilitado ou estar em processo lícito de exercício</li>
                <li>Fornecer informações verdadeiras, completas e atualizadas</li>
                <li>Manter a confidencialidade de suas credenciais de acesso</li>
            </ul>
            <p>
                Você é responsável por todas as atividades realizadas em sua conta.
                Notifique-nos imediatamente em caso de uso não autorizado:{" "}
                <strong>{LEGAL.supportEmail}</strong>.
            </p>

            <h2>4. Planos, trial e pagamentos</h2>
            <ul>
                <li>
                    Oferecemos plano gratuito com limites de uso e planos pagos
                    com recursos adicionais
                </li>
                <li>
                    Planos pagos podem incluir período de teste (trial), conforme
                    informado no momento da contratação
                </li>
                <li>
                    Pagamentos são processados pelo Stripe. Ao assinar, você
                    concorda também com os termos do Stripe
                </li>
                <li>
                    Valores, limites e funcionalidades por plano estão descritos na
                    página de preços e podem ser atualizados com aviso prévio
                </li>
                <li>
                    Cancelamentos podem ser feitos conforme as opções disponíveis
                    em Configurações → Assinatura
                </li>
            </ul>

            <h2>5. Uso aceitável</h2>
            <p>Você concorda em <strong>não</strong>:</p>
            <ul>
                <li>Utilizar a plataforma para fins ilegais ou antiéticos</li>
                <li>Compartilhar credenciais de acesso com terceiros</li>
                <li>Tentar acessar dados de outros usuários ou contornar segurança</li>
                <li>Inserir malware, realizar engenharia reversa ou sobrecarregar o sistema</li>
                <li>Utilizar a plataforma para spam ou comunicações abusivas</li>
                <li>Violar direitos de pacientes, incluindo sigilo profissional</li>
            </ul>

            <h2>6. Dados de pacientes e responsabilidades do profissional</h2>
            <p>
                O profissional é o controlador dos dados de seus pacientes
                inseridos na plataforma. O {LEGAL.appName} atua como operador de
                tecnologia, processando dados conforme instruções do profissional
                e conforme a{" "}
                <Link href="/privacy">Política de Privacidade</Link>.
            </p>
            <p>O profissional compromete-se a:</p>
            <ul>
                <li>Ter base legal para tratar dados de pacientes (LGPD)</li>
                <li>Obter consentimentos necessários quando aplicável</li>
                <li>Cumprir normas do conselho profissional e legislação de saúde</li>
                <li>Manter sigilo e usar a plataforma de forma ética</li>
            </ul>

            <h2>7. Integrações com terceiros</h2>
            <p>
                Ao conectar Google, WhatsApp ou outros serviços, você autoriza o{" "}
                {LEGAL.appName} a acessar essas plataformas nos limites dos
                escopos concedidos por você. Cada serviço possui termos próprios:
            </p>
            <ul>
                <li>
                    <a
                        href="https://policies.google.com/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Termos do Google
                    </a>
                </li>
                <li>
                    <a
                        href="https://stripe.com/legal"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Termos do Stripe
                    </a>
                </li>
            </ul>
            <p>
                O {LEGAL.appName} não se responsabiliza por indisponibilidades,
                alterações ou encerramento de serviços de terceiros. Você pode
                desconectar integrações a qualquer momento em Configurações.
            </p>

            <h2>8. Propriedade intelectual</h2>
            <p>
                A plataforma, marca, layout, código e materiais do {LEGAL.appName}
                são protegidos por direitos de propriedade intelectual. É
                concedida licença limitada, não exclusiva e revogável de uso,
                apenas para fins profissionais conforme estes Termos.
            </p>
            <p>
                Conteúdos inseridos por você (dados de pacientes, anotações,
                documentos) permanecem de sua titularidade ou de seus pacientes,
                conforme o caso.
            </p>

            <h2>9. Disponibilidade e suporte</h2>
            <p>
                Empregamos esforços comercialmente razoáveis para manter a
                plataforma disponível, mas não garantimos operação ininterrupta.
                Manutenções, atualizações e falhas de terceiros podem causar
                indisponibilidade temporária.
            </p>
            <p>
                Suporte é prestado por e-mail: <strong>{LEGAL.supportEmail}</strong>
                , com prazos conforme o plano contratado.
            </p>

            <h2>10. Limitação de responsabilidade</h2>
            <p>
                Na máxima extensão permitida pela lei aplicável, o {LEGAL.appName}{" "}
                não se responsabiliza por:
            </p>
            <ul>
                <li>Decisões clínicas ou terapêuticas do profissional</li>
                <li>Danos indiretos, lucros cessantes ou perda de dados por uso inadequado</li>
                <li>Falhas de internet, dispositivos ou serviços de terceiros</li>
                <li>Conteúdo inserido incorretamente pelo usuário</li>
            </ul>
            <p>
                A responsabilidade total do {LEGAL.appName}, quando aplicável,
                limita-se ao valor pago pelo usuário nos 12 meses anteriores ao
                evento que deu origem à reclamação.
            </p>

            <h2>11. Suspensão e encerramento</h2>
            <p>Podemos suspender ou encerrar contas que:</p>
            <ul>
                <li>Violem estes Termos ou a legislação</li>
                <li>Representem risco à segurança da plataforma ou de terceiros</li>
                <li>Permaneçam inadimplentes, após notificação quando cabível</li>
            </ul>
            <p>
                Você pode encerrar sua conta a qualquer momento. Dados serão
                tratados conforme a Política de Privacidade e prazos legais de
                retenção de prontuários.
            </p>

            <h2>12. Alterações dos Termos</h2>
            <p>
                Podemos modificar estes Termos periodicamente. Alterações
                relevantes serão comunicadas por e-mail ou aviso na plataforma.
                O uso continuado após a vigência das alterações constitui
                aceitação.
            </p>

            <h2>13. Lei aplicável e foro</h2>
            <p>
                Estes Termos são regidos pelas leis da {LEGAL.jurisdiction}. Fica
                eleito o foro da comarca do domicílio do usuário consumidor, quando
                aplicável o Código de Defesa do Consumidor, ou o foro da comarca de
                São Paulo/SP para demais casos, com renúncia a qualquer outro, por
                mais privilegiado que seja.
            </p>

            <h2>14. Contato</h2>
            <ul>
                <li>
                    <strong>E-mail:</strong> {LEGAL.supportEmail}
                </li>
                <li>
                    <strong>Política de Privacidade:</strong>{" "}
                    <Link href="/privacy">/privacy</Link>
                </li>
            </ul>

            <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200 not-prose">
                <p className="text-sm text-slate-600">
                    Ao utilizar o {LEGAL.appName}, você confirma que leu e aceita
                    estes Termos de Serviço e a Política de Privacidade vigente.
                </p>
            </div>
        </LegalPageLayout>
    );
}
