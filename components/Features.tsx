import React, { useState, useEffect, useRef } from 'react';
import { Video, Sparkles, FileText, Calendar, Wallet, ShieldCheck, Loader2 } from 'lucide-react';

const Features: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const aiSectionRef = useRef<HTMLDivElement>(null);

  const features = [
    {
      icon: <Sparkles className="w-6 h-6 text-white" />,
      title: "IA em Português",
      description: "Transcreva sessões, gere resumos clínicos e insights automáticos com nossa IA treinada para o contexto brasileiro.",
      bg: "bg-purple-600"
    },
    {
      icon: <Video className="w-6 h-6 text-white" />,
      title: "Teleconsulta Nativa",
      description: "Vídeo chamadas seguras e estáveis integradas ao prontuário. Sem limite de tempo e sem precisar instalar nada.",
      bg: "bg-blue-600"
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-white" />,
      title: "Segurança & LGPD",
      description: "Seus dados criptografados, logs de auditoria e termos de consentimento automáticos. Durma tranquilo.",
      bg: "bg-green-600"
    },
    {
      icon: <Calendar className="w-6 h-6 text-white" />,
      title: "Agenda Inteligente",
      description: "Lembretes automáticos via WhatsApp e E-mail reduzem faltas. O paciente agenda online se você permitir.",
      bg: "bg-orange-500"
    },
    {
      icon: <FileText className="w-6 h-6 text-white" />,
      title: "Prontuário Eletrônico",
      description: "Histórico completo, anotações evolutivas, upload de exames e documentos. Tudo organizado cronologicamente.",
      bg: "bg-teal-500"
    },
    {
      icon: <Wallet className="w-6 h-6 text-white" />,
      title: "Gestão Financeira",
      description: "Controle pagamentos, emita recibos e visualize seu fluxo de caixa. Saiba exatamente quanto vai receber.",
      bg: "bg-indigo-500"
    }
  ];

  // Animation logic for AI section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Reset and start animation sequence
          let step = 0;
          const interval = setInterval(() => {
            step++;
            setActiveStep(step);
            if (step >= 5) clearInterval(interval);
          }, 800); // New line every 800ms

          observer.disconnect(); // Only animate once
        }
      },
      { threshold: 0.4 }
    );

    if (aiSectionRef.current) {
      observer.observe(aiSectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const getOpacityClass = (stepThreshold: number) => {
    return `transition-all duration-700 ease-out transform ${
      activeStep >= stepThreshold 
        ? 'opacity-100 translate-x-0' 
        : 'opacity-0 -translate-x-4'
    }`;
  };

  return (
    <section id="features" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-brand-600 font-semibold tracking-wider uppercase text-sm">Recursos Poderosos</span>
          <h2 className="mt-2 text-3xl lg:text-4xl font-bold text-slate-900">
            Tudo o que você precisa para crescer
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Deixe as tarefas repetitivas com a gente e use seu tempo para o que realmente importa: seus pacientes.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-shadow duration-300 border border-slate-100 group">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 shadow-md transform group-hover:scale-110 transition-transform ${feature.bg}`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
        
        {/* Feature Highlight: AI */}
        <div 
          ref={aiSectionRef}
          className="mt-20 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-8 lg:p-12 text-white overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-1/2 h-full bg-white/5 skew-x-12 transform translate-x-20"></div>
          <div className="grid lg:grid-cols-2 gap-12 items-center relative z-10">
            <div>
              <div className="inline-block bg-indigo-500/20 text-indigo-200 text-sm font-semibold px-4 py-1.5 rounded-full mb-6 border border-indigo-500/30">
                Exclusivo PsicoGest
              </div>
              <h3 className="text-3xl font-bold mb-6">Sua assistente clínica pessoal baseada em IA</h3>
              <p className="text-indigo-100 text-lg mb-8 leading-relaxed">
                Imagine terminar a sessão e ter a transcrição e um resumo clínico estruturado prontos em segundos. Nossa IA entende o contexto terapêutico brasileiro e ajuda você a identificar padrões e insights.
              </p>
              <button className="bg-white text-indigo-900 px-6 py-3 rounded-lg font-bold hover:bg-indigo-50 transition-colors">
                Ver IA em ação
              </button>
            </div>
            
            {/* Animated Card */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-2xl relative min-h-[300px]">
              <div className="flex gap-3 mb-6 border-b border-slate-700 pb-4 items-center">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="ml-auto text-xs text-slate-400 flex items-center gap-2">
                  {activeStep < 5 ? (
                    <>
                      <Loader2 className="animate-spin w-3 h-3" />
                      Gerando resumo...
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      Concluído
                    </>
                  )}
                </span>
              </div>
              
              <div className="space-y-4 font-mono text-sm text-slate-300">
                <p className={getOpacityClass(1)}>
                  <span className="text-indigo-400 font-bold">Pacientes:</span> Relatou melhora significativa na ansiedade social durante apresentações.
                </p>
                <p className={getOpacityClass(2)}>
                  <span className="text-indigo-400 font-bold">Principais tópicos:</span> Conflito familiar (irmão), transição de carreira, exercícios de respiração.
                </p>
                <p className={getOpacityClass(3)}>
                  <span className="text-indigo-400 font-bold">Humor:</span> Estável, levemente eufórico ao relatar conquistas.
                </p>
                <p className={getOpacityClass(4)}>
                  <span className="text-indigo-400 font-bold">Próximos passos:</span> Manter diário de gratidão e tentar técnica de respiração diafragmática 2x ao dia.
                </p>
                
                <div className={`mt-6 p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-xs transition-all duration-700 delay-200 transform ${activeStep >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  <div className="flex items-center gap-2 mb-2 text-indigo-300 font-semibold">
                    <Sparkles size={14} />
                    <span>Insight da IA</span>
                  </div>
                  <p className="text-indigo-100">
                    O paciente demonstra maior resiliência quando foca em rotinas matinais. Sugiro reforçar este comportamento positivo na próxima sessão.
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