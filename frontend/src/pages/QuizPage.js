import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import axios from 'axios';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, Award, RotateCcw } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function QuizPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { t, lang, isRtl } = useLanguage();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [certId, setCertId] = useState(null);
  const [generating, setGenerating] = useState(false);

  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  useEffect(() => {
    axios.get(`${API}/courses/${courseId}/quiz`)
      .then(res => {
        setQuiz(res.data);
        setAnswers(new Array(res.data.questions.length).fill(-1));
      })
      .catch(() => navigate(`/courses/${courseId}`))
      .finally(() => setLoading(false));
  }, [courseId, navigate]);

  const handleAnswer = (qIdx, optIdx) => {
    const updated = [...answers];
    updated[qIdx] = optIdx;
    setAnswers(updated);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/courses/${courseId}/quiz/submit`, { answers });
      setResult(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGetCert = async () => {
    if (!studentName.trim()) return;
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/certificates`, {
        course_id: courseId,
        student_name: studentName.trim(),
        quiz_score: result.score
      });
      setCertId(res.data.id);
      navigate(`/certificate/${res.data.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleRetake = () => {
    setResult(null);
    setAnswers(new Array(quiz.questions.length).fill(-1));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#7079F7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!quiz) return null;

  const allAnswered = answers.every(a => a >= 0);

  return (
    <div data-testid="quiz-page" className="py-10 md:py-16">
      <div className="container mx-auto px-4 md:px-8 max-w-3xl">
        <Link to={`/courses/${courseId}`} data-testid="back-to-course" className="inline-flex items-center gap-1.5 text-[#A1A1AA] text-sm hover:text-[#7079F7] transition-colors mb-6">
          <BackArrow className="w-4 h-4" /> {t('lesson.backToCourse')}
        </Link>

        <h1 data-testid="quiz-title" className="text-2xl md:text-3xl font-bold text-[#EDEDED] mb-2">
          {lang === 'ar' ? quiz.title_ar : quiz.title_en}
        </h1>
        <p className="text-[#52525B] text-sm mb-8">
          {quiz.total_questions} {t('quiz.question')}{lang === 'en' ? 's' : ''} &middot; {lang === 'ar' ? `النجاح: ${quiz.passing_score}%` : `Passing: ${quiz.passing_score}%`}
        </p>

        {!result ? (
          <>
            <div className="space-y-6">
              {quiz.questions.map((q, qIdx) => {
                const question = lang === 'ar' ? q.question_ar : q.question_en;
                const options = lang === 'ar' ? q.options_ar : q.options_en;
                return (
                  <div key={qIdx} data-testid={`quiz-question-${qIdx}`} className="bg-[#121212] rounded-lg border border-[#27272A]/50 p-6">
                    <p className="text-[#EDEDED] font-medium mb-4">
                      <span className="text-[#7079F7]">{qIdx + 1}.</span> {question}
                    </p>
                    <div className="space-y-2">
                      {options.map((opt, optIdx) => (
                        <button
                          key={optIdx}
                          data-testid={`quiz-option-${qIdx}-${optIdx}`}
                          onClick={() => handleAnswer(qIdx, optIdx)}
                          className={`w-full text-start px-4 py-3 rounded-md text-sm transition-all ${
                            answers[qIdx] === optIdx
                              ? 'bg-[#7079F7]/10 text-[#7079F7] border border-[#7079F7]/30'
                              : 'bg-[#1A1A1A] text-[#A1A1AA] border border-[#27272A]/50 hover:border-[#27272A] hover:text-[#EDEDED]'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              data-testid="submit-quiz-btn"
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              className="mt-8 w-full py-3.5 rounded-md bg-[#7079F7] text-white font-semibold text-base hover:bg-[#5A61C9] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_-3px_rgba(112,121,247,0.4)]"
            >
              {submitting ? '...' : t('quiz.submit')}
            </button>
          </>
        ) : (
          <div data-testid="quiz-result" className="space-y-6">
            {/* Score Card */}
            <div className={`rounded-lg border p-8 text-center ${
              result.passed
                ? 'bg-[#10B981]/5 border-[#10B981]/20'
                : 'bg-[#EF4444]/5 border-[#EF4444]/20'
            }`}>
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                result.passed ? 'bg-[#10B981]/20' : 'bg-[#EF4444]/20'
              }`}>
                {result.passed ? (
                  <CheckCircle className="w-8 h-8 text-[#10B981]" />
                ) : (
                  <XCircle className="w-8 h-8 text-[#EF4444]" />
                )}
              </div>
              <h2 data-testid="quiz-result-title" className="text-xl font-bold text-[#EDEDED] mb-2">
                {result.passed ? t('quiz.passed') : t('quiz.failed')}
              </h2>
              <p className="text-3xl font-bold text-[#EDEDED] mb-1">{result.score}%</p>
              <p className="text-sm text-[#A1A1AA]">
                {result.correct} / {result.total} {t('quiz.correct')}
              </p>
            </div>

            {/* Review */}
            <div className="space-y-3">
              {result.results.map((r, i) => (
                <div key={i} className={`flex items-start gap-3 p-4 rounded-lg border ${
                  r.is_correct
                    ? 'bg-[#10B981]/5 border-[#10B981]/10'
                    : 'bg-[#EF4444]/5 border-[#EF4444]/10'
                }`}>
                  {r.is_correct ? (
                    <CheckCircle className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
                  )}
                  <span className="text-sm text-[#EDEDED]">
                    {lang === 'ar' ? r.question_ar : r.question_en}
                  </span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              {result.passed && (
                <div className="bg-[#121212] rounded-lg border border-[#27272A]/50 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-5 h-5 text-[#F59E0B]" />
                    <span className="font-semibold text-[#EDEDED]">{t('quiz.getCert')}</span>
                  </div>
                  <input
                    data-testid="student-name-input"
                    type="text"
                    placeholder={t('quiz.yourName')}
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-md bg-[#1A1A1A] border border-[#27272A] text-[#EDEDED] text-sm placeholder:text-[#52525B] focus:outline-none focus:border-[#7079F7] transition-colors mb-3"
                  />
                  <button
                    data-testid="get-certificate-btn"
                    onClick={handleGetCert}
                    disabled={!studentName.trim() || generating}
                    className="w-full py-2.5 rounded-md bg-[#F59E0B]/10 text-[#F59E0B] font-medium text-sm hover:bg-[#F59E0B]/20 transition-all border border-[#F59E0B]/20 disabled:opacity-50"
                  >
                    {generating ? '...' : t('quiz.getCert')}
                  </button>
                </div>
              )}

              {!result.passed && (
                <button
                  data-testid="retake-quiz-btn"
                  onClick={handleRetake}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-md bg-[#262626] text-[#EDEDED] font-medium hover:bg-[#3f3f46] transition-all border border-[#27272A]"
                >
                  <RotateCcw className="w-4 h-4" /> {t('quiz.retake')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
