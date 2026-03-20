import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Play, Clock, BarChart3 } from 'lucide-react';

const difficultyColors = {
  beginner: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  intermediate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function CourseCard({ course, progress }) {
  const { lang, t } = useLanguage();
  const title = lang === 'ar' ? course.title_ar : course.title_en;
  const desc = lang === 'ar' ? course.description_ar : course.description_en;
  const diffLabel = t(`courses.difficulty.${course.difficulty}`);
  const progressPct = progress || 0;

  return (
    <Link
      to={`/courses/${course.id}`}
      data-testid={`course-card-${course.id}`}
      className="group relative bg-[#121212] rounded-lg border border-[#27272A]/50 overflow-hidden transition-all duration-300 hover:border-[#7079F7]/50 hover:shadow-[0_0_20px_-5px_rgba(112,121,247,0.3)]"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-[#1A1A1A]">
        <img
          src={course.thumbnail}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => { e.target.src = `https://img.youtube.com/vi/GqmyKHy0fWg/hqdefault.jpg`; }}
        />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-[#7079F7] flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform">
            <Play className="w-6 h-6 text-white ms-0.5" fill="white" />
          </div>
        </div>
        {/* Difficulty badge */}
        <span className={`absolute top-3 ${lang === 'ar' ? 'left-3' : 'right-3'} text-xs px-2 py-1 rounded border ${difficultyColors[course.difficulty] || difficultyColors.beginner}`}>
          {diffLabel}
        </span>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-[#EDEDED] font-semibold text-base mb-2 line-clamp-2 group-hover:text-[#7079F7] transition-colors">
          {title}
        </h3>
        <p className="text-[#52525B] text-sm line-clamp-2 mb-4">{desc}</p>
        <div className="flex items-center gap-4 text-xs text-[#A1A1AA]">
          <span className="flex items-center gap-1">
            <Play className="w-3.5 h-3.5" />
            {course.lessons_count} {t('courses.lessons')}
          </span>
          {course.duration && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {course.duration}
            </span>
          )}
        </div>
        {/* Progress bar */}
        {progressPct > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[#A1A1AA]">{t('course.progress')}</span>
              <span className="text-[#7079F7] font-medium">{progressPct}%</span>
            </div>
            <div className="h-1.5 bg-[#262626] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#7079F7] rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
