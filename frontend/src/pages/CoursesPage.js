import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import CourseCard from '@/components/CourseCard';
import axios from 'axios';
import { Search, X } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getProgress(courseId, lessonsCount) {
  try {
    const data = JSON.parse(localStorage.getItem(`progress_${courseId}`) || '[]');
    if (!lessonsCount) return 0;
    return Math.round((data.length / lessonsCount) * 100);
  } catch { return 0; }
}

const categoryKeys = ['all', 'fundamentals', 'accounting', 'inventory', 'hr', 'sales', 'purchasing', 'manufacturing', 'crm', 'projects', 'education', 'advanced'];

export default function CoursesPage() {
  const { t, lang } = useLanguage();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (category !== 'all') params.category = category;
    if (search) params.search = search;
    axios.get(`${API}/courses`, { params })
      .then(res => setCourses(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [category, search]);

  return (
    <div data-testid="courses-page" className="py-10 md:py-16">
      <div className="container mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="mb-10">
          <h1 data-testid="courses-title" className="text-3xl md:text-4xl font-bold text-[#EDEDED] mb-4">
            {t('courses.title')}
          </h1>
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-5 h-5 text-[#52525B]" />
            <input
              data-testid="courses-search"
              type="text"
              placeholder={t('courses.search')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full ps-10 pe-10 py-2.5 rounded-md bg-[#121212] border border-[#27272A] text-[#EDEDED] text-sm placeholder:text-[#52525B] focus:outline-none focus:border-[#7079F7] transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute top-1/2 -translate-y-1/2 end-3">
                <X className="w-4 h-4 text-[#52525B] hover:text-[#A1A1AA]" />
              </button>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-8" data-testid="category-filters">
          {categoryKeys.map(cat => (
            <button
              key={cat}
              data-testid={`category-${cat}`}
              onClick={() => setCategory(cat)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                category === cat
                  ? 'bg-[#7079F7] text-white'
                  : 'bg-[#1A1A1A] text-[#A1A1AA] hover:bg-[#262626] hover:text-[#EDEDED] border border-[#27272A]/50'
              }`}
            >
              {t(`categories.${cat}`)}
            </button>
          ))}
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-[#121212] rounded-lg border border-[#27272A]/50 overflow-hidden animate-pulse">
                <div className="aspect-video bg-[#1A1A1A]" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-[#1A1A1A] rounded w-3/4" />
                  <div className="h-3 bg-[#1A1A1A] rounded" />
                  <div className="h-3 bg-[#1A1A1A] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div data-testid="no-courses" className="text-center py-20">
            <p className="text-[#52525B] text-lg">{t('courses.noCourses')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                progress={getProgress(course.id, course.lessons_count)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
