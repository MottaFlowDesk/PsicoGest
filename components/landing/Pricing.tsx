"use client";
import React, { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Pricing: React.FC = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const plans = [
    {
      id: "essencial",
      name: "Essencial",
      price: 97,
      description: "Para quem está começando a organizar o consultório.",
      features: [
        "60 pacientes",
        "Teleconsulta ilimitada",
        "Dashboard financeiro",
        "Pagamentos integrados",
        "Agenda completa",
        "Confirmações por e-mail",
        "Suporte via E-mail"
      ],
      highlight: false,
      buttonVariant: "outline"
    },
    {
      id: "profissional",
      name: "Profissional",
      price: 147,
      description: "Ideal para psicólogos com agenda cheia.",
      features: [
        "Tudo do Essencial",
        "Até 120 pacientes",
        "Lembretes por WhatsApp",
        "IA: 10h de transcrições/mês",
        "Suporte prioritário"
      ],
      highlight: true,
      popular: true,
      buttonVariant: "solid"
    },
    {
      id: "premium",
      name: "Premium",
      price: 247,
      description: "Para quem busca máxima eficiência e escala.",
      features: [
        "Tudo do Profissional",
        "Pacientes ilimitados",
        "IA ilimitada",
        "Suporte VIP 24h"
      ],
      highlight: false,
      buttonVariant: "outline"
    }
  ];

  const handleSelectPlan = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      // Redirect directly to Stripe Checkout (public endpoint)
      // User will create account after payment
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          billingPeriod: isAnnual ? 'annual' : 'monthly',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar assinatura');
      }

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não disponível');
      }
    } catch (error: any) {
      console.error('Error selecting plan:', error);
      toast.error(error.message || 'Erro ao processar assinatura. Tente novamente.');
      setLoadingPlan(null);
    }
  };

  return (
    <section id="pricing" className="py-24 bg-slate-50 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
            Investimento que se paga na primeira semana
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            Economize tempo e reduza no-shows. Cancele quando quiser.
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={`text-sm font-medium ${!isAnnual ? 'text-slate-900' : 'text-slate-500'}`}>Mensal</span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-14 h-8 bg-brand-600 rounded-full p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-200 ${isAnnual ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
            <span className={`text-sm font-medium ${isAnnual ? 'text-slate-900' : 'text-slate-500'}`}>
              Anual <span className="text-green-600 text-xs font-bold ml-1">-20% OFF</span>
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => {
            const finalPrice = isAnnual ? Math.floor(plan.price * 0.8) : plan.price;

            return (
              <div
                key={index}
                className={`relative bg-white rounded-2xl shadow-lg transition-all duration-300 flex flex-col ${plan.highlight ? 'border-2 border-brand-500 shadow-xl scale-105 z-10' : 'border border-slate-200 hover:border-brand-300'}`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-brand-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-md">
                    Mais Popular
                  </div>
                )}

                <div className="p-8 flex-grow">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                  <p className="text-slate-500 text-sm mb-6 min-h-[40px]">{plan.description}</p>

                  <div className="flex items-baseline mb-8">
                    <span className="text-sm text-slate-500 mr-1">R$</span>
                    <span className="text-4xl font-extrabold text-slate-900">{finalPrice}</span>
                    <span className="text-slate-500 ml-2">/mês</span>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                        <Check size={18} className="text-green-500 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-8 pt-0 mt-auto">
                  <button 
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={loadingPlan === plan.id}
                    className={`w-full py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                      loadingPlan === plan.id
                        ? 'opacity-50 cursor-not-allowed'
                        : plan.buttonVariant === 'solid'
                        ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-lg hover:shadow-brand-500/30'
                        : 'bg-white hover:bg-slate-50 text-brand-700 border-2 border-brand-100 hover:border-brand-200'
                    }`}
                  >
                    {loadingPlan === plan.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      `Escolher ${plan.name}`
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <p className="text-slate-500 text-sm">
            Experimente por 14 dias grátis.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;