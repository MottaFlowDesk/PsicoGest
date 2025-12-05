import React from 'react';

const Testimonials: React.FC = () => {
  const testimonials = [
    {
      name: "Dra. Paula Fernandes",
      role: "Psicóloga Clínica",
      location: "São Paulo, SP",
      image: "https://picsum.photos/id/64/150/150",
      quote: "Queria ter tempo para estudar casos complexos ao invés de ficar organizando planilhas. Com o PsicoGest, reduzi minha burocracia pela metade e me sinto segura com a LGPD.",
      highlight: "Redução de 10h/semana"
    },
    {
      name: "Tomás Oliveira",
      role: "Terapeuta e Coach",
      location: "Porto Alegre, RS",
      image: "https://picsum.photos/id/91/150/150",
      quote: "Preciso de algo simples que funcione do celular. O PsicoGest me deu uma imagem profissional e acabou com o problema de receber pagamentos manualmente.",
      highlight: "No-show caiu para < 5%"
    },
    {
      name: "Dr. Nicolas Silva",
      role: "Nutricionista Comportamental",
      location: "Curitiba, PR",
      image: "https://picsum.photos/id/103/150/150",
      quote: "Cada paciente tem dezenas de documentos. Preciso acessar tudo rapidamente e ter certeza que nunca vou perder. O backup automático salvou minha vida.",
      highlight: "Migrou de sistema antigo"
    }
  ];

  return (
    <section id="testimonials" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
            Aprovado por quem entende
          </h2>
          <p className="text-lg text-slate-600">
            Junte-se a centenas de profissionais que modernizaram seus consultórios.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, index) => (
            <div key={index} className="bg-slate-50 p-8 rounded-2xl border border-slate-100 flex flex-col relative">
              
              <p className="text-slate-700 italic mb-6 relative z-10 leading-relaxed">
                "{t.quote}"
              </p>
              
              <div className="mt-auto flex items-center gap-4">
                <img 
                  src={t.image} 
                  alt={t.name} 
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-brand-100"
                />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{t.name}</h4>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-200">
                 <span className="text-xs font-bold text-green-600 uppercase tracking-wide">
                    Resultado: {t.highlight}
                 </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;