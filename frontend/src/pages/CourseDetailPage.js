import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import axios from 'axios';
import { Play, Clock, BarChart3, User, CheckCircle, Circle, ArrowLeft, ArrowRight, FileQuestion, Award } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getCompletedLessons(courseId) {
  try { return JSON.parse(localStorage.getItem(`progress_${courseId}`) || '[]'); }
  catch { return []; }
}

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { t, lang, isRtl } = useLanguage();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  const completed = getCompletedLessons(courseId);

  useEffect(() => {
    axios.get(`${API}/courses/${courseId}`)
      .then(res => setCourse(res.data))
      .catch(() => navigate('/courses'))
      .finally(() => setLoading(false));
  }, [courseId, navigate]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 md:px-8 py-16">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[#1A1A1A] rounded w-1/2" />
          <div className="h-4 bg-[#1A1A1A] rounded w-3/4" />
          <div className="aspect-video bg-[#1A1A1A] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!course) return null;

  const title = lang === 'ar' ? course.title_ar : course.title_en;
  const desc = lang === 'ar' ? course.description_ar : course.description_en;
  const lessons = course.lessons || [];
  const progress = lessons.length > 0 ? Math.round((completed.length / lessons.length) * 100) : 0;
  const diffLabel = t(`courses.difficulty.${course.difficulty}`);

  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  const nextLessonIndex = lessons.findIndex((l, i) => !completed.includes(i));
  const startIndex = nextLessonIndex >= 0 ? nextLessonIndex : 0;

  return (
    <div data-testid="course-detail-page" className="py-10 md:py-16">
      <div className="container mx-auto px-4 md:px-8">
        {/* Back */}
        <Link to="/courses" data-testid="back-to-courses" className="inline-flex items-center gap-1.5 text-[#A1A1AA] text-sm hover:text-[#7079F7] transition-colors mb-6">
          <BackArrow className="w-4 h-4" /> {t('courses.title')}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Video preview */}
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl mb-8">
              <iframe
                data-testid="course-preview-video"
                src={`https://www.youtube.com/embed/${lessons[0]?.youtube_video_id || 'GqmyKHy0fWg'}?rel=0`}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
                loading="lazy"
              />
            </div>

            <h1 data-testid="course-title" className="text-2xl md:text-3xl font-bold text-[#EDEDED] mb-4">{title}</h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-[#A1A1AA]">
              <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> {course.instructor}</span>
              <span className="flex items-center gap-1.5"><Play className="w-4 h-4" /> {lessons.length} {t('course.lessons')}</span>
              {course.duration && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {course.duration}</span>}
              <span className={`px-2.5 py-0.5 rounded text-xs font-medium ${
                course.difficulty === 'beginner' ? 'bg-emerald-500/20 text-emerald-400' :
                course.difficulty === 'intermediate' ? 'bg-amber-500/20 text-amber-400' :
                'bg-red-500/20 text-red-400'
              }`}>{diffLabel}</span>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-[#EDEDED] mb-3">{t('course.description')}</h2>
              <p className="text-[#A1A1AA] leading-relaxed">{desc}</p>
            </div>

            {/* Curriculum */}
            <div>
              <h2 data-testid="curriculum-title" className="text-lg font-semibold text-[#EDEDED] mb-4">{t('course.curriculum')}</h2>
              <div className="space-y-2">
                {lessons.map((lesson, i) => {
                  const lessonTitle = lang === 'ar' ? lesson.title_ar : lesson.title_en;
                  const isCompleted = completed.includes(i);
                  return (
                    <Link
                      key={lesson.id}
                      to={`/courses/${courseId}/lesson/${i}`}
                      data-testid={`lesson-item-${i}`}
                      className={`flex items-center gap-3 p-3.5 rounded-lg border transition-all duration-200 group ${
                        isCompleted
                          ? 'bg-[#7079F7]/5 border-[#7079F7]/20 hover:border-[#7079F7]/40'
                          : 'bg-[#121212] border-[#27272A]/50 hover:border-[#27272A]'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-[#7079F7] shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-[#3f3f46] shrink-0" />
                      )}
                      <span className="flex-1 text-sm text-[#EDEDED] group-hover:text-[#7079F7] transition-colors">
                        {i + 1}. {lessonTitle}
                      </span>
                      {lesson.duration && (
                        <span className="text-xs text-[#52525B]">{lesson.duration}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* Progress Card */}
              <div className="bg-[#121212] rounded-lg border border-[#27272A]/50 p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-[#A1A1AA]">{t('course.progress')}</span>
                  <span className="text-sm font-semibold text-[#7079F7]">{progress}%</span>
                </div>
                <div className="h-2 bg-[#262626] rounded-full overflow-hidden mb-6">
                  <div className="h-full bg-[#7079F7] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
                <Link
                  to={`/courses/${courseId}/lesson/${startIndex}`}
                  data-testid="start-course-btn"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-md bg-[#7079F7] text-white font-semibold text-sm hover:bg-[#5A61C9] transition-all active:scale-95 shadow-[0_0_15px_-3px_rgba(112,121,247,0.4)]"
                >
                  <Play className="w-4 h-4" />
                  {progress > 0 ? t('course.continueLearning') : t('course.startCourse')}
                </Link>
              </div>

              {/* Quiz Card */}
              {course.has_quiz && (
                <div className="bg-[#121212] rounded-lg border border-[#27272A]/50 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <FileQuestion className="w-5 h-5 text-[#06B6D4]" />
                    <span className="text-sm font-semibold text-[#EDEDED]">{t('course.quiz')}</span>
                  </div>
                  <p className="text-xs text-[#52525B] mb-4">
                    {lang === 'ar' ? 'اختبر معلوماتك واحصل على شهادة' : 'Test your knowledge and earn a certificate'}
                  </p>
                  <Link
                    to={`/courses/${courseId}/quiz`}
                    data-testid="take-quiz-btn"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-md bg-[#06B6D4]/10 text-[#06B6D4] font-medium text-sm hover:bg-[#06B6D4]/20 transition-all border border-[#06B6D4]/20"
                  >
                    <FileQuestion className="w-4 h-4" />
                    {t('course.takeQuiz')}
                  </Link>
                </div>
              )}

              {/* YouTube link */}
              {course.youtube_playlist_id && (
                <a
                  href={`https://www.youtube.com/playlist?list=${course.youtube_playlist_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="youtube-playlist-link"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-md bg-[#262626] text-[#A1A1AA] text-sm hover:text-[#EDEDED] hover:bg-[#3f3f46] transition-all border border-[#27272A]"
                >
                  <Play className="w-4 h-4" />
                  {t('course.watchOnYouTube')}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
