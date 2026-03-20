import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import axios from 'axios';
import { Lock, Plus, Pencil, Trash2, BookOpen, FileText, FileQuestion, ChevronDown, ChevronUp, Save, X } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminPage() {
  const { t, lang } = useLanguage();
  const [verified, setVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [lessons, setLessons] = useState({});
  const [editLesson, setEditLesson] = useState(null);
  const [newLesson, setNewLesson] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/verify`, { password });
      setVerified(true);
      setError('');
      loadCourses();
    } catch {
      setError(t('admin.wrongPassword'));
    }
  };

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/courses`);
      setCourses(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadLessons = async (courseId) => {
    try {
      const res = await axios.get(`${API}/courses/${courseId}/lessons`);
      setLessons(prev => ({ ...prev, [courseId]: res.data }));
    } catch (e) { console.error(e); }
  };

  const toggleExpand = (courseId) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
    } else {
      setExpandedCourse(courseId);
      if (!lessons[courseId]) loadLessons(courseId);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد؟' : 'Are you sure?')) return;
    try {
      await axios.delete(`${API}/admin/courses/${courseId}`);
      loadCourses();
    } catch (e) { console.error(e); }
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      title_ar: formData.get('title_ar'),
      title_en: formData.get('title_en'),
      description_ar: formData.get('description_ar'),
      description_en: formData.get('description_en'),
      thumbnail: formData.get('thumbnail'),
      category: formData.get('category'),
      difficulty: formData.get('difficulty'),
      duration: formData.get('duration'),
      youtube_playlist_id: formData.get('youtube_playlist_id'),
      order: parseInt(formData.get('order') || '0'),
      is_published: true
    };
    try {
      if (editCourse?.id) {
        await axios.put(`${API}/admin/courses/${editCourse.id}`, data);
      } else {
        await axios.post(`${API}/admin/courses`, data);
      }
      setEditCourse(null);
      loadCourses();
    } catch (e) { console.error(e); }
  };

  const handleSaveLesson = async (e, courseId) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      title_ar: formData.get('title_ar'),
      title_en: formData.get('title_en'),
      description_ar: formData.get('description_ar') || '',
      description_en: formData.get('description_en') || '',
      youtube_video_id: formData.get('youtube_video_id'),
      duration: formData.get('duration') || '',
      order: parseInt(formData.get('order') || '0')
    };
    try {
      if (editLesson?.id) {
        await axios.put(`${API}/admin/lessons/${editLesson.id}`, data);
      } else {
        await axios.post(`${API}/admin/courses/${courseId}/lessons`, data);
      }
      setEditLesson(null);
      setNewLesson(null);
      loadLessons(courseId);
      loadCourses();
    } catch (e) { console.error(e); }
  };

  const handleDeleteLesson = async (lessonId, courseId) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد؟' : 'Are you sure?')) return;
    try {
      await axios.delete(`${API}/admin/lessons/${lessonId}`);
      loadLessons(courseId);
      loadCourses();
    } catch (e) { console.error(e); }
  };

  // Login screen
  if (!verified) {
    return (
      <div data-testid="admin-login" className="min-h-[60vh] flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-[#121212] rounded-lg border border-[#27272A]/50 p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 rounded-lg bg-[#7079F7]/10 flex items-center justify-center">
              <Lock className="w-6 h-6 text-[#7079F7]" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-[#EDEDED] text-center mb-6">{t('admin.title')}</h2>
          {error && <p data-testid="admin-error" className="text-red-400 text-sm text-center mb-4">{error}</p>}
          <input
            data-testid="admin-password-input"
            type="password"
            placeholder={t('admin.password')}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 rounded-md bg-[#1A1A1A] border border-[#27272A] text-[#EDEDED] text-sm placeholder:text-[#52525B] focus:outline-none focus:border-[#7079F7] transition-colors mb-4"
          />
          <button
            data-testid="admin-login-btn"
            type="submit"
            className="w-full py-2.5 rounded-md bg-[#7079F7] text-white font-semibold text-sm hover:bg-[#5A61C9] transition-all"
          >
            {t('admin.login')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div data-testid="admin-dashboard" className="py-10 md:py-16">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[#EDEDED]">{t('admin.title')}</h1>
          <button
            data-testid="add-course-btn"
            onClick={() => setEditCourse({})}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#7079F7] text-white text-sm font-medium hover:bg-[#5A61C9] transition-all"
          >
            <Plus className="w-4 h-4" /> {t('admin.addCourse')}
          </button>
        </div>

        {/* Course Form Modal */}
        {editCourse !== null && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form onSubmit={handleSaveCourse} className="bg-[#121212] rounded-lg border border-[#27272A]/50 p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[#EDEDED]">{editCourse?.id ? t('admin.editCourse') : t('admin.addCourse')}</h2>
                <button type="button" onClick={() => setEditCourse(null)} className="p-1 text-[#52525B] hover:text-[#EDEDED]"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input name="title_ar" label="العنوان بالعربي" defaultValue={editCourse?.title_ar} required />
                <Input name="title_en" label="Title (EN)" defaultValue={editCourse?.title_en} required />
                <div className="md:col-span-2"><Textarea name="description_ar" label="الوصف بالعربي" defaultValue={editCourse?.description_ar} /></div>
                <div className="md:col-span-2"><Textarea name="description_en" label="Description (EN)" defaultValue={editCourse?.description_en} /></div>
                <Input name="thumbnail" label="Thumbnail URL" defaultValue={editCourse?.thumbnail} />
                <Select name="category" label="Category" defaultValue={editCourse?.category || 'fundamentals'}
                  options={[
                    {v:'fundamentals',l:'Fundamentals'},{v:'accounting',l:'Accounting'},{v:'inventory',l:'Inventory'},
                    {v:'hr',l:'HR'},{v:'sales',l:'Sales'},{v:'purchasing',l:'Purchasing'},
                    {v:'manufacturing',l:'Manufacturing'},{v:'crm',l:'CRM'},{v:'projects',l:'Projects'},
                    {v:'education',l:'Education'},{v:'advanced',l:'Advanced'}
                  ]}
                />
                <Select name="difficulty" label="Difficulty" defaultValue={editCourse?.difficulty || 'beginner'}
                  options={[{v:'beginner',l:'Beginner'},{v:'intermediate',l:'Intermediate'},{v:'advanced',l:'Advanced'}]}
                />
                <Input name="duration" label="Duration" defaultValue={editCourse?.duration} />
                <Input name="youtube_playlist_id" label="YouTube Playlist ID" defaultValue={editCourse?.youtube_playlist_id} />
                <Input name="order" label="Order" type="number" defaultValue={editCourse?.order || 0} />
              </div>
              <div className="flex items-center justify-end gap-3 mt-6">
                <button type="button" onClick={() => setEditCourse(null)} className="px-4 py-2 rounded-md text-sm text-[#A1A1AA] hover:text-[#EDEDED] transition-colors">
                  {t('admin.cancel')}
                </button>
                <button data-testid="save-course-btn" type="submit" className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#7079F7] text-white text-sm font-medium hover:bg-[#5A61C9] transition-all">
                  <Save className="w-4 h-4" /> {t('admin.save')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Courses List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-16 bg-[#121212] rounded-lg border border-[#27272A]/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map(course => (
              <div key={course.id} className="bg-[#121212] rounded-lg border border-[#27272A]/50 overflow-hidden">
                {/* Course row */}
                <div className="flex items-center gap-4 p-4">
                  <button onClick={() => toggleExpand(course.id)} className="p-1 text-[#52525B] hover:text-[#A1A1AA]">
                    {expandedCourse === course.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p data-testid={`admin-course-${course.id}`} className="text-sm font-medium text-[#EDEDED] truncate">
                      {lang === 'ar' ? course.title_ar : course.title_en}
                    </p>
                    <p className="text-xs text-[#52525B]">{course.lessons_count} {t('admin.lessons')} &middot; {course.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      data-testid={`edit-course-${course.id}`}
                      onClick={() => setEditCourse(course)}
                      className="p-2 rounded-md text-[#A1A1AA] hover:text-[#7079F7] hover:bg-white/5 transition-all"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      data-testid={`delete-course-${course.id}`}
                      onClick={() => handleDeleteCourse(course.id)}
                      className="p-2 rounded-md text-[#A1A1AA] hover:text-[#EF4444] hover:bg-white/5 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded lessons */}
                {expandedCourse === course.id && (
                  <div className="border-t border-[#27272A]/50 px-4 py-3 bg-[#0A0A0A]/50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-[#A1A1AA] uppercase">{t('admin.lessons')}</span>
                      <button
                        data-testid={`add-lesson-${course.id}`}
                        onClick={() => setNewLesson(course.id)}
                        className="flex items-center gap-1 text-xs text-[#7079F7] hover:underline"
                      >
                        <Plus className="w-3 h-3" /> {lang === 'ar' ? 'إضافة درس' : 'Add Lesson'}
                      </button>
                    </div>

                    {/* New Lesson Form */}
                    {newLesson === course.id && (
                      <form onSubmit={(e) => handleSaveLesson(e, course.id)} className="bg-[#121212] rounded-lg border border-[#7079F7]/20 p-4 mb-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Input name="title_ar" label="العنوان بالعربي" required small />
                          <Input name="title_en" label="Title (EN)" required small />
                          <Input name="youtube_video_id" label="YouTube Video ID" required small />
                          <Input name="duration" label="Duration" small />
                          <Input name="order" label="Order" type="number" defaultValue={0} small />
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-3">
                          <button type="button" onClick={() => setNewLesson(null)} className="px-3 py-1.5 text-xs text-[#A1A1AA]">{t('admin.cancel')}</button>
                          <button type="submit" className="px-3 py-1.5 rounded bg-[#7079F7] text-white text-xs font-medium">{t('admin.save')}</button>
                        </div>
                      </form>
                    )}

                    {/* Lessons list */}
                    <div className="space-y-1">
                      {(lessons[course.id] || []).map((lesson, i) => (
                        <div key={lesson.id} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/5 group">
                          <span className="text-xs text-[#52525B] w-5">{lesson.order || i + 1}</span>
                          <span className="flex-1 text-sm text-[#A1A1AA] truncate">{lang === 'ar' ? lesson.title_ar : lesson.title_en}</span>
                          <span className="text-xs text-[#52525B]">{lesson.duration}</span>
                          <button
                            onClick={() => handleDeleteLesson(lesson.id, course.id)}
                            className="p-1 rounded text-[#52525B] hover:text-[#EF4444] opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {(lessons[course.id] || []).length === 0 && (
                        <p className="text-xs text-[#52525B] text-center py-4">{lang === 'ar' ? 'لا توجد دروس' : 'No lessons'}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper components
function Input({ name, label, defaultValue, required, type = 'text', small }) {
  return (
    <div>
      <label className={`block ${small ? 'text-xs' : 'text-sm'} text-[#A1A1AA] mb-1`}>{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className={`w-full px-3 ${small ? 'py-1.5 text-xs' : 'py-2 text-sm'} rounded-md bg-[#1A1A1A] border border-[#27272A] text-[#EDEDED] placeholder:text-[#52525B] focus:outline-none focus:border-[#7079F7] transition-colors`}
      />
    </div>
  );
}

function Textarea({ name, label, defaultValue }) {
  return (
    <div>
      <label className="block text-sm text-[#A1A1AA] mb-1">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={3}
        className="w-full px-3 py-2 rounded-md bg-[#1A1A1A] border border-[#27272A] text-[#EDEDED] text-sm placeholder:text-[#52525B] focus:outline-none focus:border-[#7079F7] transition-colors resize-none"
      />
    </div>
  );
}

function Select({ name, label, defaultValue, options }) {
  return (
    <div>
      <label className="block text-sm text-[#A1A1AA] mb-1">{label}</label>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full px-3 py-2 rounded-md bg-[#1A1A1A] border border-[#27272A] text-[#EDEDED] text-sm focus:outline-none focus:border-[#7079F7] transition-colors"
      >
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}
