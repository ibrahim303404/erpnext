import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import CourseCard from '@/components/CourseCard';
import axios from 'axios';
import { ArrowLeft, ArrowRight, BookOpen, GraduationCap, Users, Award, Play, CheckCircle, BarChart3, FileText } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getProgress(courseId, lessonsCount) {
  try {
    const data = JSON.parse(localStorage.getItem(`progress_${courseId}`) || '[]');
    if (!lessonsCount) return 0;
    return Math.round((data.length / lessonsCount) * 100);
  } catch { return 0; }
}

export default function HomePage() {
  const { t, lang, isRtl } = useLanguage();
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/courses`),
      axios.get(`${API}/stats`)
    ]).then(([coursesRes, statsRes]) => {
      setCourses(coursesRes.data);
      setStats(statsRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const featured = courses.slice(0, 4);
  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  return (
    <div data-testid="home-page">
      {/* Hero */}
      <section className="hero-gradient relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-8 py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7079F7]/10 border border-[#7079F7]/20 text-[#7079F7] text-sm mb-6 animate-fadeInUp">
              <BookOpen className="w-4 h-4" />
              <span>{lang === 'ar' ? 'منصة ERPNext التعليمية الأولى بالعربية' : 'First Arabic ERPNext Learning Platform'}</span>
            </div>
            <h1 data-testid="hero-title" className="text-4xl md:text-6xl font-bold text-[#EDEDED] tracking-tight mb-6 animate-fadeInUp delay-100" style={{ opacity: 0 }}>
              {t('home.heroTitle')}
            </h1>
            <p className="text-lg md:text-xl text-[#A1A1AA] leading-relaxed mb-10 animate-fadeInUp delay-200" style={{ opacity: 0 }}>
              {t('home.heroSubtitle')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 animate-fadeInUp delay-300" style={{ opacity: 0 }}>
              <Link
                to="/courses"
                data-testid="hero-start-btn"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-md bg-[#7079F7] text-white font-semibold text-base hover:bg-[#5A61C9] transition-all duration-200 active:scale-95 shadow-[0_0_15px_-3px_rgba(112,121,247,0.4)]"
              >
                {t('home.startLearning')}
                <Arrow className="w-5 h-5" />
              </Link>
              <a
                href="https://www.youtube.com/@erpnextAR"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="hero-youtube-btn"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-md bg-[#262626] text-[#EDEDED] font-medium text-base hover:bg-[#3f3f46] transition-all duration-200 border border-[#27272A]"
              >
                <Play className="w-5 h-5" />
                YouTube
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-[#27272A]/50 bg-[#0A0A0A]">
        <div className="container mx-auto px-4 md:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8" data-testid="stats-section">
            {[
              { icon: BookOpen, value: stats.courses_count || 12, label: t('home.stats.courses'), color: '#7079F7' },
              { icon: Play, value: stats.lessons_count || 70, label: t('home.stats.lessons'), color: '#06B6D4' },
              { icon: Award, value: stats.certificates_issued || 0, label: t('home.stats.certificates'), color: '#10B981' },
              { icon: Users, value: stats.students_count || 150, label: t('home.stats.students'), color: '#F59E0B' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg mb-3" style={{ background: `${stat.color}15` }}>
                  <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-[#EDEDED] mb-1">{stat.value}</div>
                <div className="text-sm text-[#A1A1AA]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between mb-10">
            <h2 data-testid="featured-title" className="text-2xl md:text-3xl font-bold text-[#EDEDED]">
              {t('home.featuredCourses')}
            </h2>
            <Link
              to="/courses"
              data-testid="view-all-link"
              className="text-[#7079F7] text-sm font-medium hover:underline flex items-center gap-1"
            >
              {t('home.viewAll')} <Arrow className="w-4 h-4" />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-[#121212] rounded-lg border border-[#27272A]/50 overflow-hidden animate-pulse">
                  <div className="aspect-video bg-[#1A1A1A]" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-[#1A1A1A] rounded w-3/4" />
                    <div className="h-3 bg-[#1A1A1A] rounded w-full" />
                    <div className="h-3 bg-[#1A1A1A] rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featured.map(course => (
                <CourseCard
                  key={course.id}
                  course={course}
                  progress={getProgress(course.id, course.lessons_count)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why Us */}
      <section className="py-16 md:py-20 bg-[#0A0A0A]">
        <div className="container mx-auto px-4 md:px-8">
          <h2 data-testid="why-us-title" className="text-2xl md:text-3xl font-bold text-[#EDEDED] text-center mb-12">
            {t('home.whyUs')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: FileText, title: t('home.features.f1Title'), desc: t('home.features.f1Desc'), color: '#7079F7' },
              { icon: CheckCircle, title: t('home.features.f2Title'), desc: t('home.features.f2Desc'), color: '#06B6D4' },
              { icon: BarChart3, title: t('home.features.f3Title'), desc: t('home.features.f3Desc'), color: '#10B981' },
              { icon: GraduationCap, title: t('home.features.f4Title'), desc: t('home.features.f4Desc'), color: '#F59E0B' },
            ].map((feature, i) => (
              <div
                key={i}
                data-testid={`feature-card-${i}`}
                className="p-6 rounded-lg bg-[#121212] border border-[#27272A]/50 transition-all duration-300 hover:border-[#27272A] group"
              >
                <div className="w-12 h-12 rounded-lg mb-4 flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ background: `${feature.color}15` }}>
                  <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
                </div>
                <h3 className="text-[#EDEDED] font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-[#52525B] text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
