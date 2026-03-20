import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { BookOpen, Globe, Menu, X, Settings } from 'lucide-react';

export default function Navbar() {
  const { t, lang, toggleLang, isRtl } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const links = [
    { to: '/', label: t('nav.home') },
    { to: '/courses', label: t('nav.courses') },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav data-testid="navbar" className="sticky top-0 z-50 glass-heavy">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group" data-testid="nav-logo">
            <div className="w-9 h-9 rounded-lg bg-[#7079F7] flex items-center justify-center transition-transform group-hover:scale-110">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-[#EDEDED] hidden sm:block">
              {lang === 'ar' ? 'ERPNext بالعربي' : 'ERPNext Arabic'}
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(link => (
              <Link
                key={link.to}
                to={link.to}
                data-testid={`nav-link-${link.to.replace('/', '') || 'home'}`}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive(link.to)
                    ? 'text-white bg-white/10'
                    : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              data-testid="lang-toggle"
              onClick={toggleLang}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-[#A1A1AA] hover:text-white hover:bg-white/5 transition-all"
            >
              <Globe className="w-4 h-4" />
              <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
            </button>
            <Link
              to="/admin"
              data-testid="nav-admin"
              className="p-2 rounded-md text-[#A1A1AA] hover:text-white hover:bg-white/5 transition-all"
            >
              <Settings className="w-4 h-4" />
            </Link>
            <button
              data-testid="mobile-menu-toggle"
              className="md:hidden p-2 rounded-md text-[#A1A1AA] hover:text-white"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/5 py-3 animate-fadeIn">
            {links.map(link => (
              <Link
                key={link.to}
                to={link.to}
                data-testid={`mobile-nav-${link.to.replace('/', '') || 'home'}`}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                  isActive(link.to)
                    ? 'text-white bg-white/10'
                    : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
