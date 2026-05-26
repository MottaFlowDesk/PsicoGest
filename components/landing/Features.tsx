import React from 'react';
import { Video, MessageCircle, FileText, Calendar, Wallet, ShieldCheck, Link2 } from 'lucide-react';

const Features: React.FC = () => {
  const features = [
    {
      icon: <Link2 className="w-6 h-6 text-white" />,
      title: "Integrações Google",
      description:
        "Sincronize sua agenda com o Google Calendar, envie confirmações por Gmail e gere links do Google Meet para teleconsultas.",
      bg: "bg-purple-600",
    },
    {
      icon: <Video className="w-6 h-6 text-white" />,
      title: "Teleconsulta com Google Meet",
      description:
        "Links de reunião criados automaticamente após a confirmação do paciente. Integrado ao calendário e ao prontuário.",
      bg: "bg-blue-600",
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-white" />,
      title: "Segurança & LGPD",
      description:
        "Dados protegidos, controle de acesso por profissional e boas práticas para conformidade com a LGPD.",
      bg: "bg-green-600",
    },
    {
      icon: <Calendar className="w-6 h-6 text-white" />,
      title: "Agenda e Lembretes",
      description:
        "Calendário visual, confirmação por link e lembretes automáticos por e-mail e WhatsApp para reduzir faltas.",
      bg: "bg-orange-500",
    },
    {
      icon: <FileText className="w-6 h-6 text-white" />,
      title: "Prontuário Eletrônico",
      description:
        "Histórico de sessões, anotações evolutivas e documentos organizados por paciente.",
      bg: "bg-teal-500",
    },
    {
      icon: <Wallet className="w-6 h-6 text-white" />,
      title: "Gestão Financeira",
      description:
        "Controle de pagamentos, emissão de recibos e visão do fluxo de caixa do consultório.",
      bg: "bg-indigo-500",
    },
  ];

  return (
    <section id="features" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-brand-600 font-semibold tracking-wider uppercase text-sm">
            Recursos
          </span>
          <h2 className="mt-2 text-3xl lg:text-4xl font-bold text-slate-900">
            Tudo o que você precisa para crescer
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Deixe as tarefas repetitivas com a gente e use seu tempo para o que
            realmente importa: seus pacientes.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-shadow duration-300 border border-slate-100 group"
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 shadow-md transform group-hover:scale-110 transition-transform ${feature.bg}`}
              >
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">
                {feature.title}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-20 bg-gradient-to-br from-brand-700 to-slate-900 rounded-3xl p-8 lg:p-12 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-white/5 skew-x-12 transform translate-x-20" />
          <div className="grid lg:grid-cols-2 gap-12 items-center relative z-10">
            <div>
              <div className="inline-block bg-white/10 text-brand-100 text-sm font-semibold px-4 py-1.5 rounded-full mb-6 border border-white/20">
                Automação disponível hoje
              </div>
              <h3 className="text-3xl font-bold mb-6">
                Menos faltas, mais organização
              </h3>
              <p className="text-slate-200 text-lg mb-8 leading-relaxed">
                Envie confirmações por e-mail com um clique, sincronize com o
                Google Calendar e avise pacientes pelo WhatsApp — tudo integrado
                ao seu fluxo de atendimento.
              </p>
            </div>

            <div className="bg-slate-800/80 rounded-xl p-6 border border-slate-600 space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-brand-300 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Agenda sincronizada</p>
                  <p className="text-sm text-slate-400">
                    Eventos no Google Calendar com link de Meet quando for
                    teleconsulta.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MessageCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Confirmação por link</p>
                  <p className="text-sm text-slate-400">
                    O paciente confirma presença pelo e-mail ou WhatsApp e você
                    é notificado na hora.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Prontuário integrado</p>
                  <p className="text-sm text-slate-400">
                    Sessões, histórico e documentos no mesmo lugar do
                    agendamento.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
