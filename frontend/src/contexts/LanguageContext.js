import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const LanguageContext = createContext();

const translations = {
  ar: {
    nav: { home: "الرئيسية", courses: "الدورات", admin: "لوحة التحكم" },
    home: {
      heroTitle: "أتقن ERPNext باللغة العربية",
      heroSubtitle: "منصة تعليمية متكاملة لتعلم نظام ERPNext خطوة بخطوة مع فيديوهات عملية واختبارات وشهادات",
      startLearning: "ابدأ التعلم",
      browseCourses: "تصفح الدورات",
      stats: { courses: "دورة تعليمية", lessons: "درس", certificates: "شهادة صادرة", students: "متعلم" },
      featuredCourses: "الدورات المميزة",
      viewAll: "عرض الكل",
      whyUs: "لماذا تختارنا؟",
      features: {
        f1Title: "محتوى عربي أصيل",
        f1Desc: "دروس مصممة خصيصاً باللغة العربية مع شرح عملي مفصل",
        f2Title: "اختبارات تفاعلية",
        f2Desc: "اختبر معلوماتك بعد كل دورة واحصل على شهادة إتمام",
        f3Title: "تتبع التقدم",
        f3Desc: "تابع تقدمك في كل دورة واستكمل التعلم من حيث توقفت",
        f4Title: "شهادات معتمدة",
        f4Desc: "احصل على شهادة إتمام لكل دورة تكملها بنجاح"
      }
    },
    courses: {
      title: "جميع الدورات",
      search: "ابحث عن دورة...",
      all: "الكل",
      noCourses: "لا توجد دورات مطابقة",
      lessons: "درس",
      difficulty: { beginner: "مبتدئ", intermediate: "متوسط", advanced: "متقدم" }
    },
    course: {
      lessons: "الدروس",
      quiz: "الاختبار",
      certificate: "الشهادة",
      startCourse: "ابدأ الدورة",
      continueLearning: "أكمل التعلم",
      progress: "التقدم",
      completed: "مكتمل",
      instructor: "المدرب",
      duration: "المدة",
      level: "المستوى",
      description: "وصف الدورة",
      curriculum: "المنهج الدراسي",
      takeQuiz: "خذ الاختبار",
      getCertificate: "احصل على الشهادة",
      watchOnYouTube: "شاهد على يوتيوب"
    },
    lesson: {
      previous: "السابق",
      next: "التالي",
      markComplete: "تحديد كمكتمل",
      markedComplete: "مكتمل",
      backToCourse: "العودة للدورة"
    },
    quiz: {
      title: "الاختبار",
      question: "السؤال",
      of: "من",
      submit: "إرسال الإجابات",
      result: "النتيجة",
      passed: "مبروك! لقد نجحت",
      failed: "لم تنجح. حاول مرة أخرى",
      score: "النتيجة",
      correct: "إجابات صحيحة",
      retake: "إعادة الاختبار",
      getCert: "احصل على الشهادة",
      enterName: "أدخل اسمك",
      yourName: "اسمك الكامل"
    },
    certificate: {
      title: "شهادة إتمام",
      certifies: "يشهد بأن",
      completed: "قد أتم بنجاح دورة",
      score: "بنتيجة اختبار",
      date: "تاريخ الإصدار",
      code: "رمز الشهادة",
      print: "طباعة الشهادة",
      download: "تحميل",
      back: "العودة للدورة"
    },
    admin: {
      title: "لوحة التحكم",
      password: "كلمة المرور",
      login: "دخول",
      courses: "الدورات",
      addCourse: "إضافة دورة",
      editCourse: "تعديل الدورة",
      deleteCourse: "حذف",
      lessons: "الدروس",
      quizzes: "الاختبارات",
      save: "حفظ",
      cancel: "إلغاء",
      wrongPassword: "كلمة المرور خاطئة"
    },
    footer: {
      about: "منصة تعليمية لتعلم ERPNext باللغة العربية",
      links: "روابط سريعة",
      contact: "تواصل معنا",
      rights: "جميع الحقوق محفوظة"
    },
    categories: {
      all: "الكل",
      fundamentals: "الأساسيات",
      accounting: "المحاسبة",
      inventory: "المخازن",
      hr: "الموارد البشرية",
      sales: "المبيعات",
      purchasing: "المشتريات",
      manufacturing: "التصنيع",
      crm: "إدارة العملاء",
      projects: "المشاريع",
      education: "التعليم",
      advanced: "متقدم"
    }
  },
  en: {
    nav: { home: "Home", courses: "Courses", admin: "Admin" },
    home: {
      heroTitle: "Master ERPNext in Arabic",
      heroSubtitle: "A complete learning platform to master ERPNext step by step with practical videos, quizzes, and certificates",
      startLearning: "Start Learning",
      browseCourses: "Browse Courses",
      stats: { courses: "Courses", lessons: "Lessons", certificates: "Certificates", students: "Learners" },
      featuredCourses: "Featured Courses",
      viewAll: "View All",
      whyUs: "Why Choose Us?",
      features: {
        f1Title: "Arabic Content",
        f1Desc: "Lessons designed in Arabic with detailed practical explanations",
        f2Title: "Interactive Quizzes",
        f2Desc: "Test your knowledge after each course and earn a completion certificate",
        f3Title: "Progress Tracking",
        f3Desc: "Track your progress in each course and continue where you left off",
        f4Title: "Certificates",
        f4Desc: "Get a completion certificate for each course you successfully finish"
      }
    },
    courses: {
      title: "All Courses",
      search: "Search for a course...",
      all: "All",
      noCourses: "No matching courses found",
      lessons: "lessons",
      difficulty: { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" }
    },
    course: {
      lessons: "Lessons",
      quiz: "Quiz",
      certificate: "Certificate",
      startCourse: "Start Course",
      continueLearning: "Continue Learning",
      progress: "Progress",
      completed: "Completed",
      instructor: "Instructor",
      duration: "Duration",
      level: "Level",
      description: "Course Description",
      curriculum: "Curriculum",
      takeQuiz: "Take Quiz",
      getCertificate: "Get Certificate",
      watchOnYouTube: "Watch on YouTube"
    },
    lesson: {
      previous: "Previous",
      next: "Next",
      markComplete: "Mark as Complete",
      markedComplete: "Completed",
      backToCourse: "Back to Course"
    },
    quiz: {
      title: "Quiz",
      question: "Question",
      of: "of",
      submit: "Submit Answers",
      result: "Result",
      passed: "Congratulations! You Passed",
      failed: "You didn't pass. Try again",
      score: "Score",
      correct: "Correct Answers",
      retake: "Retake Quiz",
      getCert: "Get Certificate",
      enterName: "Enter your name",
      yourName: "Your full name"
    },
    certificate: {
      title: "Certificate of Completion",
      certifies: "This certifies that",
      completed: "has successfully completed the course",
      score: "with a quiz score of",
      date: "Issue Date",
      code: "Certificate Code",
      print: "Print Certificate",
      download: "Download",
      back: "Back to Course"
    },
    admin: {
      title: "Admin Dashboard",
      password: "Password",
      login: "Login",
      courses: "Courses",
      addCourse: "Add Course",
      editCourse: "Edit Course",
      deleteCourse: "Delete",
      lessons: "Lessons",
      quizzes: "Quizzes",
      save: "Save",
      cancel: "Cancel",
      wrongPassword: "Wrong password"
    },
    footer: {
      about: "An educational platform for learning ERPNext in Arabic",
      links: "Quick Links",
      contact: "Contact Us",
      rights: "All rights reserved"
    },
    categories: {
      all: "All",
      fundamentals: "Fundamentals",
      accounting: "Accounting",
      inventory: "Inventory",
      hr: "Human Resources",
      sales: "Sales",
      purchasing: "Purchasing",
      manufacturing: "Manufacturing",
      crm: "CRM",
      projects: "Projects",
      education: "Education",
      advanced: "Advanced"
    }
  }
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'ar');

  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback((key) => {
    const keys = key.split('.');
    let val = translations[lang];
    for (const k of keys) {
      val = val?.[k];
    }
    return val || key;
  }, [lang]);

  const toggleLang = useCallback(() => {
    setLang(prev => prev === 'ar' ? 'en' : 'ar');
  }, []);

  const isRtl = lang === 'ar';

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, toggleLang, isRtl }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
