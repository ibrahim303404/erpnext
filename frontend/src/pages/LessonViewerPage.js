import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import axios from 'axios';
import { ArrowLeft, ArrowRight, CheckCircle, Circle, ChevronLeft, ChevronRight, List, X } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getCompletedLessons(courseId) {
  try { return JSON.parse(localStorage.getItem(`progress_${courseId}`) || '[]'); }
  catch { return []; }
}

function setCompletedLesson(courseId, index) {
  const completed = getCompletedLessons(courseId);
  if (!completed.includes(index)) {
    completed.push(index);
    localStorage.setItem(`progress_${courseId}`, JSON.stringify(completed));
  }
  return completed;
}

export default function LessonViewerPage() {
  const { courseId, lessonIndex } = useParams();
  const navigate = useNavigate();
  const { t, lang, isRtl } = useLanguage();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [completed, setCompleted] = useState([]);

  const idx = parseInt(lessonIndex) || 0;

  useEffect(() => {
    axios.get(`${API}/courses/${courseId}`)
      .then(res => {
        setCourse(res.data);
        setCompleted(getCompletedLessons(courseId));
      })
      .catch(() => navigate('/courses'))
      .finally(() => setLoading(false));
  }, [courseId, navigate]);

  const markComplete = useCallback(() => {
    const updated = setCompletedLesson(courseId, idx);
    setCompleted([...updated]);
  }, [courseId, idx]);

  if (loading || !course) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="w-8 h-8 border-2 border-[#7079F7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const lessons = course.lessons || [];
  const lesson = lessons[idx];
  if (!lesson) {
    navigate(`/courses/${courseId}`);
    return null;
  }

  const title = lang === 'ar' ? lesson.title_ar : lesson.title_en;
  const courseTitle = lang === 'ar' ? course.title_ar : course.title_en;
  const isCompleted = completed.includes(idx);
  const hasPrev = idx > 0;
  const hasNext = idx < lessons.length - 1;

  const PrevIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;
  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  return (
    <div data-testid="lesson-viewer-page" className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Top bar */}
      <div className="bg-[#0A0A0A] border-b border-[#27272A]/50 px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <Link to={`/courses/${courseId}`} data-testid="back-to-course-btn" className="flex items-center gap-1.5 text-[#A1A1AA] text-sm hover:text-[#7079F7] transition-colors">
            <BackArrow className="w-4 h-4" /> {courseTitle}
          </Link>
          <button
            data-testid="toggle-sidebar-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 rounded-md text-[#A1A1AA] hover:text-white hover:bg-white/5"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <List className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Video Area */}
        <div className="flex-1 flex flex-col">
          {/* Video */}
          <div className="bg-black">
            <div className="container mx-auto max-w-5xl">
              <div className="relative aspect-video">
                <iframe
                  data-testid="lesson-video-player"
                  src={`https://www.youtube.com/embed/${lesson.youtube_video_id}?rel=0&modestbranding=1`}
                  title={title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-[#0A0A0A] border-t border-[#27272A]/50 px-4 py-4">
            <div className="container mx-auto max-w-5xl">
              <div className="flex items-center justify-between mb-4">
                <h2 data-testid="lesson-title" className="text-lg font-semibold text-[#EDEDED]">
                  {idx + 1}. {title}
                </h2>
                {lesson.duration && <span className="text-sm text-[#52525B]">{lesson.duration}</span>}
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {hasPrev && (
                    <button
                      data-testid="prev-lesson-btn"
                      onClick={() => navigate(`/courses/${courseId}/lesson/${idx - 1}`)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#262626] text-[#A1A1AA] text-sm hover:text-[#EDEDED] hover:bg-[#3f3f46] transition-all border border-[#27272A]"
                    >
                      <PrevIcon className="w-4 h-4" /> {t('lesson.previous')}
                    </button>
                  )}
                  {hasNext && (
                    <button
                      data-testid="next-lesson-btn"
                      onClick={() => navigate(`/courses/${courseId}/lesson/${idx + 1}`)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#262626] text-[#A1A1AA] text-sm hover:text-[#EDEDED] hover:bg-[#3f3f46] transition-all border border-[#27272A]"
                    >
                      {t('lesson.next')} <NextIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  data-testid="mark-complete-btn"
                  onClick={markComplete}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    isCompleted
                      ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20'
                      : 'bg-[#7079F7] text-white hover:bg-[#5A61C9] active:scale-95 shadow-[0_0_15px_-3px_rgba(112,121,247,0.4)]'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  {isCompleted ? t('lesson.markedComplete') : t('lesson.markComplete')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Curriculum */}
        <div className={`${sidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} fixed md:relative top-0 end-0 h-full w-80 bg-[#0A0A0A] border-s border-[#27272A]/50 overflow-y-auto transition-transform duration-300 z-40 md:z-auto`}>
          <div className="p-4 border-b border-[#27272A]/50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#EDEDED]">{t('course.curriculum')}</h3>
              <span className="text-xs text-[#52525B]">{completed.length}/{lessons.length}</span>
            </div>
          </div>
          <div className="p-2">
            {lessons.map((l, i) => {
              const lTitle = lang === 'ar' ? l.title_ar : l.title_en;
              const isCurrent = i === idx;
              const isDone = completed.includes(i);
              return (
                <button
                  key={l.id}
                  data-testid={`sidebar-lesson-${i}`}
                  onClick={() => { navigate(`/courses/${courseId}/lesson/${i}`); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-start text-sm transition-all mb-0.5 ${
                    isCurrent
                      ? 'bg-[#7079F7]/10 text-[#7079F7] border border-[#7079F7]/20'
                      : isDone
                        ? 'text-[#A1A1AA] hover:bg-white/5'
                        : 'text-[#52525B] hover:bg-white/5 hover:text-[#A1A1AA]'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle className="w-4 h-4 text-[#10B981] shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 shrink-0" />
                  )}
                  <span className="truncate">{i + 1}. {lTitle}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
