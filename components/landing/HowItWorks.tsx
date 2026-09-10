import React from 'react';
import { UserPlus, CalendarCheck, TrendingUp } from 'lucide-react';

const HowItWorks: React.FC = () => {
  const steps = [
    {
      icon: <UserPlus className="w-8 h-8 text-brand-600" />,
      title: "1. Crie sua conta",
      desc: "Cadastro em menos de 2 minutos. Teste 14 dias grátis. Importe seus pacientes atuais facilmente."
    },
    {
      icon: <CalendarCheck className="w-8 h-8 text-brand-600" />,
      title: "2. Organize a agenda",
      desc: "Defina seus horários, envie confirmação por link e lembretes automáticos por e-mail."
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-brand-600" />,
      title: "3. Atenda e Evolua",
      desc: "Realize teleconsultas via Google Meet, registre sessões no prontuário e acompanhe o financeiro do consultório."
    }
  ];

  return (
    <section id="how-it-works" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900">
            Comece em 3 passos simples
          </h2>
          <p className="mt-4 text-slate-600">
            Onboarding completo em menos de 15 minutos.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector Line for Desktop */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-brand-100 -z-10"></div>

          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-lg">
                {step.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
              <p className="text-slate-600 max-w-xs">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;