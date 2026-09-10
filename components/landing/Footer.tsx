import Link from 'next/link';
import React from 'react';
import { BrainCircuit, Instagram, Linkedin, Mail } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4 text-white">
              <div className="bg-brand-600 p-1.5 rounded-lg">
                <BrainCircuit size={24} />
              </div>
              <span className="font-bold text-xl">PsicoGuest</span>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              A plataforma completa para gestão de saúde mental. Segurança, praticidade e organização para o seu consultório.
            </p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors"><Instagram size={20} /></a>
              <a href="#" className="hover:text-white transition-colors"><Linkedin size={20} /></a>
              <a href="#" className="hover:text-white transition-colors"><Mail size={20} /></a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Produto</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Funcionalidades</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Preços</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Segurança (LGPD)</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Integrações</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Recursos</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Central de Ajuda</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Guia de Gestão</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Webinars</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Contato</h4>
            <ul className="space-y-2 text-sm">
              <li>suporte@psicoguest.com.br</li>
              <li>WhatsApp: (11) 99999-9999</li>
              <li className="pt-2">Av. Paulista, 1000 - SP</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} PsicoGuest. Todos os direitos reservados.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="/terms" className="hover:text-slate-300">
              Termos de Serviço
            </Link>
            <Link href="/privacy" className="hover:text-slate-300">
              Política de Privacidade
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;