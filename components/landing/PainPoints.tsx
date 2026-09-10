import React from 'react';
import { X, Check, FileWarning, Clock, Lock } from 'lucide-react';

const PainPoints: React.FC = () => {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
            A realidade de 90% dos profissionais
          </h2>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            Você não estudou anos para gastar metade da semana gerenciando planilhas, WhatsApp e agendas de papel.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-6 text-red-600">
              <Clock size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Sobrecarga Administrativa</h3>
            <p className="text-slate-600 leading-relaxed">
              Média de 8 a 12 horas semanais perdidas agendando, cobrando e organizando documentos manualmente.
            </p>
          </div>
          <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
             <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-6 text-orange-600">
              <FileWarning size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Caos de Ferramentas</h3>
            <p className="text-slate-600 leading-relaxed">
              WhatsApp para conversa, Google Agenda para datas, Excel para financeiro e Dropbox para arquivos. Fragmentado e inseguro.
            </p>
          </div>
          <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
             <div className="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center mb-6 text-slate-700">
              <Lock size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Risco Legal (LGPD)</h3>
            <p className="text-slate-600 leading-relaxed">
              Prontuários salvos sem criptografia e dados de pacientes expostos. Um risco constante para seu CRP/CRM.
            </p>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="bg-brand-900 rounded-3xl overflow-hidden shadow-2xl text-white">
          <div className="grid md:grid-cols-2">
            <div className="p-10 md:p-14 bg-slate-800/50 backdrop-blur-sm border-b md:border-b-0 md:border-r border-slate-700">
              <h3 className="text-2xl font-bold mb-8 text-slate-300">Como você trabalha hoje</h3>
              <ul className="space-y-4">
                {[
                  "4 a 6 aplicativos diferentes",
                  "Custo mensal: R$ 300 - R$ 800",
                  "Sem backup automático garantido",
                  "15-20% de Taxa de No-Show",
                  "Risco de vazamento de dados"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-400">
                    <X className="text-red-500 shrink-0" size={20} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="p-10 md:p-14 bg-brand-600 relative overflow-hidden">
               <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
              <h3 className="text-2xl font-bold mb-8 text-white">Com PsicoGuest</h3>
              <ul className="space-y-4">
                {[
                  "Tudo em uma única plataforma",
                  "Planos a partir de R$ 97/mês",
                  "Backup em nuvem criptografada",
                  "Redução drástica de No-Shows",
                  "Backup e isolamento por profissional"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 font-medium">
                    <div className="bg-white/20 p-1 rounded-full">
                       <Check className="text-white shrink-0" size={14} />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PainPoints;