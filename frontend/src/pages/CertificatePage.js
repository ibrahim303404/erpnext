import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import axios from 'axios';
import { Award, ArrowLeft, ArrowRight, Printer, BookOpen } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CertificatePage() {
  const { certId } = useParams();
  const { t, lang, isRtl } = useLanguage();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);

  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  useEffect(() => {
    axios.get(`${API}/certificates/${certId}`)
      .then(res => setCert(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [certId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#7079F7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-[#52525B]">{lang === 'ar' ? 'الشهادة غير موجودة' : 'Certificate not found'}</p>
      </div>
    );
  }

  const courseTitle = lang === 'ar' ? cert.course_title_ar : cert.course_title_en;
  const date = new Date(cert.completion_date).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div data-testid="certificate-page" className="py-10 md:py-16">
      <div className="container mx-auto px-4 md:px-8 max-w-4xl">
        {/* Actions - no print */}
        <div className="flex items-center justify-between mb-8 no-print">
          <Link to={`/courses/${cert.course_id}`} data-testid="back-from-cert" className="inline-flex items-center gap-1.5 text-[#A1A1AA] text-sm hover:text-[#7079F7] transition-colors">
            <BackArrow className="w-4 h-4" /> {t('certificate.back')}
          </Link>
          <button
            data-testid="print-certificate-btn"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#7079F7] text-white text-sm font-medium hover:bg-[#5A61C9] transition-all"
          >
            <Printer className="w-4 h-4" /> {t('certificate.print')}
          </button>
        </div>

        {/* Certificate */}
        <div data-testid="certificate-card" className="bg-gradient-to-br from-[#121212] to-[#1A1A1A] rounded-xl border-2 border-[#7079F7]/30 p-8 md:p-12 relative overflow-hidden">
          {/* Decorative corners */}
          <div className="absolute top-0 start-0 w-24 h-24 border-t-2 border-s-2 border-[#7079F7]/40 rounded-tl-xl" />
          <div className="absolute top-0 end-0 w-24 h-24 border-t-2 border-e-2 border-[#7079F7]/40 rounded-tr-xl" />
          <div className="absolute bottom-0 start-0 w-24 h-24 border-b-2 border-s-2 border-[#7079F7]/40 rounded-bl-xl" />
          <div className="absolute bottom-0 end-0 w-24 h-24 border-b-2 border-e-2 border-[#7079F7]/40 rounded-br-xl" />

          <div className="text-center relative z-10">
            {/* Logo */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#7079F7]/10 border border-[#7079F7]/20 mb-6">
              <Award className="w-8 h-8 text-[#F59E0B]" />
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold text-[#7079F7] mb-2">{t('certificate.title')}</h1>
            <div className="w-20 h-0.5 bg-[#7079F7]/30 mx-auto mb-8" />

            {/* Certifies */}
            <p className="text-[#A1A1AA] text-sm mb-2">{t('certificate.certifies')}</p>
            <h2 data-testid="cert-student-name" className="text-3xl md:text-4xl font-bold text-[#EDEDED] mb-6">
              {cert.student_name}
            </h2>

            <p className="text-[#A1A1AA] text-sm mb-2">{t('certificate.completed')}</p>
            <h3 data-testid="cert-course-title" className="text-xl md:text-2xl font-semibold text-[#EDEDED] mb-6">
              {courseTitle}
            </h3>

            {cert.quiz_score > 0 && (
              <p className="text-[#A1A1AA] text-sm mb-6">
                {t('certificate.score')}: <span className="text-[#10B981] font-semibold">{cert.quiz_score}%</span>
              </p>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-8 pt-6 border-t border-[#27272A]/50">
              <div>
                <p className="text-xs text-[#52525B] mb-1">{t('certificate.date')}</p>
                <p className="text-sm text-[#EDEDED] font-medium">{date}</p>
              </div>
              <div>
                <p className="text-xs text-[#52525B] mb-1">{t('certificate.code')}</p>
                <p data-testid="cert-code" className="text-sm text-[#7079F7] font-mono font-medium">{cert.certificate_code}</p>
              </div>
            </div>

            {/* Brand */}
            <div className="mt-8 flex items-center justify-center gap-2">
              <BookOpen className="w-4 h-4 text-[#52525B]" />
              <span className="text-xs text-[#52525B]">ERPNext {lang === 'ar' ? 'بالعربي' : 'Arabic'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
