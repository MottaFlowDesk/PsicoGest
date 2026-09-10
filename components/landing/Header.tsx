"use client";
import Link from 'next/link';
import React, { useState } from 'react';
import { Menu, X, BrainCircuit } from 'lucide-react';

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const navLinks = [
    { name: 'Funcionalidades', id: 'features' },
    { name: 'Como Funciona', id: 'how-it-works' },
    { name: 'Preços', id: 'pricing' },
    { name: 'Depoimentos', id: 'testimonials' },
  ];

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 80; // Altura do header (h-20)
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
    setIsOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="bg-brand-600 p-1.5 rounded-lg text-white">
              <BrainCircuit size={28} />
            </div>
            <span className="font-bold text-2xl text-slate-800 tracking-tight">PsicoGuest</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-8 items-center">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={`#${link.id}`}
                onClick={(e) => handleScroll(e, link.id)}
                className="text-slate-600 hover:text-brand-600 font-medium transition-colors text-sm lg:text-base"
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/login?logout=true"
              className="text-slate-600 hover:text-brand-600 font-medium text-sm"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className="text-brand-600 hover:text-brand-700 font-medium text-sm"
            >
              Criar conta
            </Link>
            <a
              href="#pricing"
              onClick={(e) => handleScroll(e, 'pricing')}
              className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-full font-semibold transition-all shadow-lg hover:shadow-brand-500/30 text-sm"
            >
              Ver Planos
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="text-slate-600 hover:text-slate-900 focus:outline-none"
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-slate-100">
          <div className="px-4 pt-2 pb-6 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={`#${link.id}`}
                onClick={(e) => handleScroll(e, link.id)}
                className="block px-3 py-3 rounded-md text-base font-medium text-slate-700 hover:text-brand-600 hover:bg-slate-50"
              >
                {link.name}
              </a>
            ))}
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3">
              <Link
                href="/login?logout=true"
                className="w-full text-center text-slate-600 font-medium py-2"
                onClick={() => setIsOpen(false)}
              >
                Entrar
              </Link>
              <Link
                href="/signup"
                className="w-full text-center text-brand-600 font-medium py-2"
                onClick={() => setIsOpen(false)}
              >
                Criar conta grátis
              </Link>
              <a
                href="#pricing"
                onClick={(e) => {
                  handleScroll(e, 'pricing');
                  setIsOpen(false);
                }}
                className="w-full text-center bg-brand-600 text-white px-4 py-3 rounded-lg font-semibold shadow-md"
              >
                Ver Planos
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;