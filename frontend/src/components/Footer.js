import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { BookOpen, Youtube, Mail } from 'lucide-react';

export default function Footer() {
  const { t, lang } = useLanguage();

  return (
    <footer data-testid="footer" className="bg-[#0A0A0A] border-t border-[#27272A]/50 mt-auto">
      <div className="container mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#7079F7] flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-[#EDEDED]">
                {lang === 'ar' ? 'ERPNext بالعربي' : 'ERPNext Arabic'}
              </span>
            </div>
            <p className="text-[#52525B] text-sm leading-relaxed">{t('footer.about')}</p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-[#EDEDED] font-semibold mb-4">{t('footer.links')}</h4>
            <div className="flex flex-col gap-2">
              <Link to="/" className="text-[#A1A1AA] text-sm hover:text-[#7079F7] transition-colors">{t('nav.home')}</Link>
              <Link to="/courses" className="text-[#A1A1AA] text-sm hover:text-[#7079F7] transition-colors">{t('nav.courses')}</Link>
              <a href="https://www.youtube.com/@erpnextAR" target="_blank" rel="noopener noreferrer" className="text-[#A1A1AA] text-sm hover:text-[#7079F7] transition-colors flex items-center gap-1.5">
                <Youtube className="w-3.5 h-3.5" /> YouTube
              </a>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-[#EDEDED] font-semibold mb-4">{t('footer.contact')}</h4>
            <a href="https://www.youtube.com/@erpnextAR" target="_blank" rel="noopener noreferrer" className="text-[#A1A1AA] text-sm hover:text-[#7079F7] transition-colors flex items-center gap-1.5">
              <Youtube className="w-3.5 h-3.5" /> ERPNext بالعربي
            </a>
          </div>
        </div>

        <div className="border-t border-[#27272A]/50 mt-8 pt-6 text-center">
          <p className="text-[#52525B] text-sm">
            &copy; {new Date().getFullYear()} ERPNext {lang === 'ar' ? 'بالعربي' : 'Arabic'}. {t('footer.rights')}
          </p>
        </div>
      </div>
    </footer>
  );
}
