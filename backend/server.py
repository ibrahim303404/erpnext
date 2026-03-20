from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# --- Pydantic Models ---
class Lesson(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    course_id: str
    title_ar: str
    title_en: str
    description_ar: str = ""
    description_en: str = ""
    youtube_video_id: str
    duration: str = ""
    order: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class QuizQuestion(BaseModel):
    question_ar: str
    question_en: str
    options_ar: List[str]
    options_en: List[str]
    correct_answer_index: int

class Quiz(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    course_id: str
    title_ar: str
    title_en: str
    questions: List[QuizQuestion]
    passing_score: int = 70
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Course(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title_ar: str
    title_en: str
    description_ar: str
    description_en: str
    thumbnail: str = ""
    category: str = "general"
    difficulty: str = "beginner"
    lessons_count: int = 0
    duration: str = ""
    youtube_playlist_id: str = ""
    instructor: str = "ERPNext بالعربي"
    is_published: bool = True
    order: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Certificate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    course_id: str
    course_title_ar: str = ""
    course_title_en: str = ""
    student_name: str
    completion_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    quiz_score: int = 0
    certificate_code: str = Field(default_factory=lambda: f"CERT-{uuid.uuid4().hex[:8].upper()}")

# --- Request Models ---
class CourseCreate(BaseModel):
    title_ar: str
    title_en: str
    description_ar: str
    description_en: str
    thumbnail: str = ""
    category: str = "general"
    difficulty: str = "beginner"
    duration: str = ""
    youtube_playlist_id: str = ""
    order: int = 0
    is_published: bool = True

class LessonCreate(BaseModel):
    title_ar: str
    title_en: str
    description_ar: str = ""
    description_en: str = ""
    youtube_video_id: str
    duration: str = ""
    order: int = 0

class QuizCreate(BaseModel):
    title_ar: str
    title_en: str
    questions: List[QuizQuestion]
    passing_score: int = 70

class QuizSubmit(BaseModel):
    answers: List[int]
    student_name: str = ""

class CertificateCreate(BaseModel):
    course_id: str
    student_name: str
    quiz_score: int = 0

class AdminVerify(BaseModel):
    password: str

# --- Public Routes ---
@api_router.get("/")
async def root():
    return {"message": "ERPNext Arabic Learning Platform API"}

@api_router.get("/stats")
async def get_stats():
    courses_count = await db.courses.count_documents({"is_published": True})
    lessons_count = await db.lessons.count_documents({})
    certs_count = await db.certificates.count_documents({})
    return {
        "courses_count": courses_count,
        "lessons_count": lessons_count,
        "certificates_issued": certs_count,
        "students_count": certs_count + 150
    }

@api_router.get("/courses")
async def get_courses(category: Optional[str] = None, search: Optional[str] = None):
    query = {"is_published": True}
    if category and category != "all":
        query["category"] = category
    if search:
        query["$or"] = [
            {"title_ar": {"$regex": search, "$options": "i"}},
            {"title_en": {"$regex": search, "$options": "i"}},
            {"description_ar": {"$regex": search, "$options": "i"}},
            {"description_en": {"$regex": search, "$options": "i"}}
        ]
    courses = await db.courses.find(query, {"_id": 0}).sort("order", 1).to_list(100)
    return courses

@api_router.get("/courses/{course_id}")
async def get_course(course_id: str):
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    lessons = await db.lessons.find({"course_id": course_id}, {"_id": 0}).sort("order", 1).to_list(100)
    quiz = await db.quizzes.find_one({"course_id": course_id}, {"_id": 0})
    course["lessons"] = lessons
    course["has_quiz"] = quiz is not None
    return course

@api_router.get("/courses/{course_id}/lessons")
async def get_lessons(course_id: str):
    lessons = await db.lessons.find({"course_id": course_id}, {"_id": 0}).sort("order", 1).to_list(100)
    return lessons

@api_router.get("/courses/{course_id}/quiz")
async def get_quiz(course_id: str):
    quiz = await db.quizzes.find_one({"course_id": course_id}, {"_id": 0})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    safe_questions = []
    for q in quiz["questions"]:
        safe_questions.append({
            "question_ar": q["question_ar"],
            "question_en": q["question_en"],
            "options_ar": q["options_ar"],
            "options_en": q["options_en"]
        })
    return {
        "id": quiz["id"],
        "course_id": quiz["course_id"],
        "title_ar": quiz["title_ar"],
        "title_en": quiz["title_en"],
        "questions": safe_questions,
        "passing_score": quiz["passing_score"],
        "total_questions": len(safe_questions)
    }

@api_router.post("/courses/{course_id}/quiz/submit")
async def submit_quiz(course_id: str, submission: QuizSubmit):
    quiz = await db.quizzes.find_one({"course_id": course_id}, {"_id": 0})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    correct = 0
    total = len(quiz["questions"])
    results = []
    for i, q in enumerate(quiz["questions"]):
        user_answer = submission.answers[i] if i < len(submission.answers) else -1
        is_correct = user_answer == q["correct_answer_index"]
        if is_correct:
            correct += 1
        results.append({
            "question_ar": q["question_ar"],
            "question_en": q["question_en"],
            "correct_answer_index": q["correct_answer_index"],
            "user_answer": user_answer,
            "is_correct": is_correct
        })
    score = int((correct / total) * 100) if total > 0 else 0
    passed = score >= quiz["passing_score"]
    return {
        "score": score,
        "correct": correct,
        "total": total,
        "passed": passed,
        "passing_score": quiz["passing_score"],
        "results": results
    }

@api_router.post("/certificates")
async def create_certificate(cert_data: CertificateCreate):
    course = await db.courses.find_one({"id": cert_data.course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    cert = Certificate(
        course_id=cert_data.course_id,
        course_title_ar=course["title_ar"],
        course_title_en=course["title_en"],
        student_name=cert_data.student_name,
        quiz_score=cert_data.quiz_score
    )
    doc = cert.model_dump()
    await db.certificates.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/certificates/{cert_id}")
async def get_certificate(cert_id: str):
    cert = await db.certificates.find_one({"id": cert_id}, {"_id": 0})
    if not cert:
        cert = await db.certificates.find_one({"certificate_code": cert_id}, {"_id": 0})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return cert

@api_router.get("/categories")
async def get_categories():
    cats = await db.courses.distinct("category")
    return cats

# --- Admin Routes ---
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin2024")

@api_router.post("/admin/verify")
async def admin_verify(data: AdminVerify):
    if data.password == ADMIN_PASSWORD:
        return {"verified": True}
    raise HTTPException(status_code=401, detail="Invalid password")

@api_router.get("/admin/courses")
async def admin_get_courses():
    courses = await db.courses.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return courses

@api_router.post("/admin/courses")
async def admin_create_course(data: CourseCreate):
    course = Course(**data.model_dump())
    lessons_count = await db.lessons.count_documents({"course_id": course.id})
    course.lessons_count = lessons_count
    doc = course.model_dump()
    await db.courses.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/admin/courses/{course_id}")
async def admin_update_course(course_id: str, data: CourseCreate):
    update_data = data.model_dump()
    result = await db.courses.update_one({"id": course_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    return {"updated": True}

@api_router.delete("/admin/courses/{course_id}")
async def admin_delete_course(course_id: str):
    await db.courses.delete_one({"id": course_id})
    await db.lessons.delete_many({"course_id": course_id})
    await db.quizzes.delete_many({"course_id": course_id})
    return {"deleted": True}

@api_router.post("/admin/courses/{course_id}/lessons")
async def admin_create_lesson(course_id: str, data: LessonCreate):
    lesson = Lesson(course_id=course_id, **data.model_dump())
    doc = lesson.model_dump()
    await db.lessons.insert_one(doc)
    doc.pop("_id", None)
    count = await db.lessons.count_documents({"course_id": course_id})
    await db.courses.update_one({"id": course_id}, {"$set": {"lessons_count": count}})
    return doc

@api_router.put("/admin/lessons/{lesson_id}")
async def admin_update_lesson(lesson_id: str, data: LessonCreate):
    result = await db.lessons.update_one({"id": lesson_id}, {"$set": data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return {"updated": True}

@api_router.delete("/admin/lessons/{lesson_id}")
async def admin_delete_lesson(lesson_id: str):
    lesson = await db.lessons.find_one({"id": lesson_id}, {"_id": 0})
    if lesson:
        await db.lessons.delete_one({"id": lesson_id})
        count = await db.lessons.count_documents({"course_id": lesson["course_id"]})
        await db.courses.update_one({"id": lesson["course_id"]}, {"$set": {"lessons_count": count}})
    return {"deleted": True}

@api_router.post("/admin/courses/{course_id}/quiz")
async def admin_create_quiz(course_id: str, data: QuizCreate):
    await db.quizzes.delete_many({"course_id": course_id})
    quiz = Quiz(course_id=course_id, **data.model_dump())
    doc = quiz.model_dump()
    await db.quizzes.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/admin/courses/{course_id}/quiz")
async def admin_get_quiz(course_id: str):
    quiz = await db.quizzes.find_one({"course_id": course_id}, {"_id": 0})
    if not quiz:
        return None
    return quiz

# --- Seed Data ---
@api_router.post("/seed")
async def seed_data():
    existing = await db.courses.count_documents({})
    if existing > 0:
        return {"message": "Data already seeded", "courses_count": existing}

    courses_data = [
        {
            "id": "course-intro",
            "title_ar": "مقدمة في ERPNext",
            "title_en": "Introduction to ERPNext",
            "description_ar": "دورة شاملة للمبتدئين تغطي أساسيات نظام ERPNext، من التثبيت والإعداد إلى الاستخدام اليومي. تعلم كيفية إعداد الشركة والمستخدمين والأذونات.",
            "description_en": "A comprehensive beginner course covering ERPNext fundamentals, from installation and setup to daily usage. Learn how to configure company, users, and permissions.",
            "thumbnail": "https://img.youtube.com/vi/GqmyKHy0fWg/maxresdefault.jpg",
            "category": "fundamentals",
            "difficulty": "beginner",
            "lessons_count": 8,
            "duration": "2 ساعة",
            "youtube_playlist_id": "PLc7WwN9eZ4hKjQ_0frnyNOXqBOmjtYY_F",
            "order": 1
        },
        {
            "id": "course-accounting",
            "title_ar": "الحسابات والمحاسبة",
            "title_en": "Accounting & Finance",
            "description_ar": "تعلم إدارة الحسابات في ERPNext بما في ذلك شجرة الحسابات، مراكز التكلفة، القيود اليومية، الميزانيات، والتقارير المالية.",
            "description_en": "Learn accounting management in ERPNext including chart of accounts, cost centers, journal entries, budgets, and financial reports.",
            "thumbnail": "https://img.youtube.com/vi/7n5H4411jIE/maxresdefault.jpg",
            "category": "accounting",
            "difficulty": "intermediate",
            "lessons_count": 7,
            "duration": "3 ساعات",
            "youtube_playlist_id": "PLc7WwN9eZ4hKRZQo-KD3ouHHKkWbLgZuj",
            "order": 2
        },
        {
            "id": "course-stock",
            "title_ar": "إدارة المخازن",
            "title_en": "Stock Management",
            "description_ar": "دورة متكاملة في إدارة المخازن تشمل أساسيات المخزون، حركات المخزون، الجرد، والتقارير. تعلم كيفية إدارة المستودعات بكفاءة.",
            "description_en": "Complete stock management course covering inventory basics, stock movements, inventory count, and reports. Learn efficient warehouse management.",
            "thumbnail": "https://img.youtube.com/vi/w18B5Th4GEs/maxresdefault.jpg",
            "category": "inventory",
            "difficulty": "intermediate",
            "lessons_count": 6,
            "duration": "2.5 ساعة",
            "youtube_playlist_id": "PLc7WwN9eZ4hIMTcLXZ_xR5J26hCl0Uc8M",
            "order": 3
        },
        {
            "id": "course-hr",
            "title_ar": "الموارد البشرية",
            "title_en": "Human Resources",
            "description_ar": "تعلم إدارة الموارد البشرية في ERPNext من إنشاء الموظفين إلى إدارة الإجازات والحضور والانصراف وتقييم الأداء.",
            "description_en": "Learn HR management in ERPNext from employee creation to leave management, attendance tracking, and performance appraisals.",
            "thumbnail": "https://img.youtube.com/vi/s4zz78rcDG0/maxresdefault.jpg",
            "category": "hr",
            "difficulty": "intermediate",
            "lessons_count": 6,
            "duration": "2 ساعة",
            "youtube_playlist_id": "PLc7WwN9eZ4hL0tpuwJ-OZiUnJRxODCkI-",
            "order": 4
        },
        {
            "id": "course-selling",
            "title_ar": "المبيعات",
            "title_en": "Sales & Selling",
            "description_ar": "دورة شاملة في إدارة المبيعات تغطي عروض الأسعار، طلبات البيع، فواتير المبيعات، والتقارير. تعلم دورة المبيعات الكاملة.",
            "description_en": "Comprehensive sales management course covering quotations, sales orders, sales invoices, and reports. Learn the complete sales cycle.",
            "thumbnail": "https://img.youtube.com/vi/7mbrTIzOObw/maxresdefault.jpg",
            "category": "sales",
            "difficulty": "beginner",
            "lessons_count": 5,
            "duration": "1.5 ساعة",
            "youtube_playlist_id": "PLc7WwN9eZ4hLwcHvNZnxnvTAZjnL7T5df",
            "order": 5
        },
        {
            "id": "course-buying",
            "title_ar": "المشتريات",
            "title_en": "Purchasing & Buying",
            "description_ar": "تعلم إدارة المشتريات في ERPNext من إنشاء طلبات الشراء إلى استلام المواد والفواتير وتحليل أداء الموردين.",
            "description_en": "Learn purchasing management in ERPNext from purchase orders to material receipts, invoices, and supplier performance analysis.",
            "thumbnail": "https://img.youtube.com/vi/iPw2hriKi_w/maxresdefault.jpg",
            "category": "purchasing",
            "difficulty": "beginner",
            "lessons_count": 4,
            "duration": "1 ساعة",
            "youtube_playlist_id": "PLc7WwN9eZ4hK-P6_vdQc_R9EPEUKalWBi",
            "order": 6
        },
        {
            "id": "course-manufacturing",
            "title_ar": "التصنيع",
            "title_en": "Manufacturing",
            "description_ar": "دورة متقدمة في إدارة التصنيع تشمل قوائم المواد، أوامر العمل، محطات العمل، وتخطيط الإنتاج في ERPNext.",
            "description_en": "Advanced manufacturing management course covering BOMs, work orders, workstations, and production planning in ERPNext.",
            "thumbnail": "https://img.youtube.com/vi/FNZt7xaXK50/maxresdefault.jpg",
            "category": "manufacturing",
            "difficulty": "advanced",
            "lessons_count": 6,
            "duration": "3 ساعات",
            "youtube_playlist_id": "PLc7WwN9eZ4hJxHvRPif1QvUQow4kWITKS",
            "order": 7
        },
        {
            "id": "course-crm",
            "title_ar": "إدارة علاقات العملاء",
            "title_en": "CRM - Customer Relations",
            "description_ar": "تعلم إدارة علاقات العملاء في ERPNext من تتبع العملاء المحتملين إلى إدارة الفرص وحملات التسويق.",
            "description_en": "Learn CRM in ERPNext from lead tracking to opportunity management and marketing campaigns.",
            "thumbnail": "https://img.youtube.com/vi/WHm7xrd4144/maxresdefault.jpg",
            "category": "crm",
            "difficulty": "beginner",
            "lessons_count": 5,
            "duration": "1.5 ساعة",
            "youtube_playlist_id": "PLc7WwN9eZ4hJdXS89DPghoUckdQpAszL1",
            "order": 8
        },
        {
            "id": "course-payroll",
            "title_ar": "المرتبات",
            "title_en": "Payroll Management",
            "description_ar": "دورة شاملة في إدارة المرتبات تغطي هياكل الرواتب، إنشاء قسائم الرواتب، الخصومات، والتقارير المالية للرواتب.",
            "description_en": "Comprehensive payroll management course covering salary structures, payslip generation, deductions, and payroll financial reports.",
            "thumbnail": "https://img.youtube.com/vi/05JNvsOj9PM/maxresdefault.jpg",
            "category": "hr",
            "difficulty": "intermediate",
            "lessons_count": 5,
            "duration": "2 ساعة",
            "youtube_playlist_id": "PLc7WwN9eZ4hJ5QtRuMst4ZdhIrQOnEOgK",
            "order": 9
        },
        {
            "id": "course-projects",
            "title_ar": "إدارة المشاريع",
            "title_en": "Project Management",
            "description_ar": "تعلم إدارة المشاريع في ERPNext بما في ذلك تعريف المشروع، المهام، التكاليف، والتأثيرات المحاسبية.",
            "description_en": "Learn project management in ERPNext including project definition, tasks, costs, and accounting impacts.",
            "thumbnail": "https://img.youtube.com/vi/db7_PYMjdXI/maxresdefault.jpg",
            "category": "projects",
            "difficulty": "intermediate",
            "lessons_count": 3,
            "duration": "45 دقيقة",
            "youtube_playlist_id": "PLc7WwN9eZ4hIKTDbyIpD3KEFZ5MtrRj8A",
            "order": 10
        },
        {
            "id": "course-education",
            "title_ar": "إدارة التعليم",
            "title_en": "Education Management",
            "description_ar": "تعلم كيفية إدارة المؤسسات التعليمية في ERPNext بما في ذلك إدارة الطلاب والمنصات التعليمية والربط مع المحاسبة.",
            "description_en": "Learn how to manage educational institutions in ERPNext including student management, educational platforms, and accounting integration.",
            "thumbnail": "https://img.youtube.com/vi/ATiN1WmtIdk/maxresdefault.jpg",
            "category": "education",
            "difficulty": "intermediate",
            "lessons_count": 5,
            "duration": "2 ساعة",
            "youtube_playlist_id": "PLc7WwN9eZ4hL2ZPhelLiUyQ7eOV-b1tiu",
            "order": 11
        },
        {
            "id": "course-v15",
            "title_ar": "مميزات الإصدار 15",
            "title_en": "Version 15 Features",
            "description_ar": "استكشف الميزات الجديدة في الإصدار الخامس عشر من ERPNext بما في ذلك تسوية الدفعات، تقارير الأصول، والتحسينات المحاسبية.",
            "description_en": "Explore new features in ERPNext Version 15 including payment reconciliation, asset reports, and accounting improvements.",
            "thumbnail": "https://img.youtube.com/vi/LXay5ftydIc/maxresdefault.jpg",
            "category": "advanced",
            "difficulty": "advanced",
            "lessons_count": 6,
            "duration": "1 ساعة",
            "youtube_playlist_id": "PLc7WwN9eZ4hIu-pOQvRQz6CSjJFV4WU6f",
            "order": 12
        }
    ]

    lessons_data = [
        # Introduction Course
        {"course_id": "course-intro", "title_ar": "مقدمة عن ERPNext", "title_en": "Introduction to ERPNext", "youtube_video_id": "GqmyKHy0fWg", "duration": "9:07", "order": 1},
        {"course_id": "course-intro", "title_ar": "الإعداد الأساسي للنظام", "title_en": "System Basic Setup", "youtube_video_id": "XAPOh95I6xg", "duration": "16:19", "order": 2},
        {"course_id": "course-intro", "title_ar": "إعدادات النظام", "title_en": "System Configuration", "youtube_video_id": "wmS6ydkfNyQ", "duration": "13:13", "order": 3},
        {"course_id": "course-intro", "title_ar": "إعدادات الطباعة", "title_en": "Print Settings", "youtube_video_id": "hm5oyQPtG34", "duration": "10:00", "order": 4},
        {"course_id": "course-intro", "title_ar": "المستخدم والأذونات", "title_en": "Users and Permissions", "youtube_video_id": "q_uwHy7666A", "duration": "16:10", "order": 5},
        {"course_id": "course-intro", "title_ar": "تخصيص النماذج", "title_en": "Form Customization", "youtube_video_id": "gnPkM-b7IT0", "duration": "8:30", "order": 6},
        {"course_id": "course-intro", "title_ar": "سير العمل", "title_en": "Workflow Setup", "youtube_video_id": "0Twnn2XrqWE", "duration": "12:00", "order": 7},
        {"course_id": "course-intro", "title_ar": "الإضافات والتخصيصات", "title_en": "Add-ons & Customization", "youtube_video_id": "TDfq6v_byMM", "duration": "9:45", "order": 8},
        # Accounting Course
        {"course_id": "course-accounting", "title_ar": "مقدمة وشجرة الحسابات", "title_en": "Introduction & Chart of Accounts", "youtube_video_id": "7n5H4411jIE", "duration": "6:12", "order": 1},
        {"course_id": "course-accounting", "title_ar": "مراكز التكلفة", "title_en": "Cost Centers", "youtube_video_id": "N_xIGBVlYW4", "duration": "8:30", "order": 2},
        {"course_id": "course-accounting", "title_ar": "القيود اليومية", "title_en": "Journal Entries", "youtube_video_id": "QFwtWwH546s", "duration": "10:15", "order": 3},
        {"course_id": "course-accounting", "title_ar": "فواتير المبيعات", "title_en": "Sales Invoices", "youtube_video_id": "TrIA5zcvqp0", "duration": "12:00", "order": 4},
        {"course_id": "course-accounting", "title_ar": "فواتير المشتريات", "title_en": "Purchase Invoices", "youtube_video_id": "E9IjE9748CI", "duration": "11:30", "order": 5},
        {"course_id": "course-accounting", "title_ar": "الميزانيات", "title_en": "Budgets", "youtube_video_id": "DuYyETITv9M", "duration": "9:00", "order": 6},
        {"course_id": "course-accounting", "title_ar": "التقارير المالية", "title_en": "Financial Reports", "youtube_video_id": "hBPL0T4C6Nw", "duration": "7:45", "order": 7},
        # Stock Management Course
        {"course_id": "course-stock", "title_ar": "أساسيات المخازن", "title_en": "Stock Basics", "youtube_video_id": "w18B5Th4GEs", "duration": "12:09", "order": 1},
        {"course_id": "course-stock", "title_ar": "إعداد المستودعات", "title_en": "Warehouse Setup", "youtube_video_id": "2sUjqEWwObM", "duration": "10:30", "order": 2},
        {"course_id": "course-stock", "title_ar": "استلام المواد", "title_en": "Material Receipt", "youtube_video_id": "Sn1_yIkodlg", "duration": "8:45", "order": 3},
        {"course_id": "course-stock", "title_ar": "إصدار المواد", "title_en": "Material Issue", "youtube_video_id": "U-IIUOrJVyE", "duration": "9:15", "order": 4},
        {"course_id": "course-stock", "title_ar": "نقل المخزون", "title_en": "Stock Transfer", "youtube_video_id": "nO51NlpQiRU", "duration": "7:30", "order": 5},
        {"course_id": "course-stock", "title_ar": "تقارير المخزون", "title_en": "Stock Reports", "youtube_video_id": "oPck1Dyasn4", "duration": "11:00", "order": 6},
        # HR Course
        {"course_id": "course-hr", "title_ar": "إعداد الموارد البشرية", "title_en": "HR Setup", "youtube_video_id": "s4zz78rcDG0", "duration": "14:00", "order": 1},
        {"course_id": "course-hr", "title_ar": "إنشاء الموظفين", "title_en": "Employee Creation", "youtube_video_id": "GqmyKHy0fWg", "duration": "10:30", "order": 2},
        {"course_id": "course-hr", "title_ar": "إدارة الإجازات", "title_en": "Leave Management", "youtube_video_id": "XAPOh95I6xg", "duration": "12:15", "order": 3},
        {"course_id": "course-hr", "title_ar": "الحضور والانصراف", "title_en": "Attendance Tracking", "youtube_video_id": "wmS6ydkfNyQ", "duration": "9:45", "order": 4},
        {"course_id": "course-hr", "title_ar": "تقييم الأداء", "title_en": "Performance Appraisal", "youtube_video_id": "q_uwHy7666A", "duration": "11:00", "order": 5},
        {"course_id": "course-hr", "title_ar": "التقارير", "title_en": "HR Reports", "youtube_video_id": "hm5oyQPtG34", "duration": "8:30", "order": 6},
        # Selling Course
        {"course_id": "course-selling", "title_ar": "مقدمة في المبيعات", "title_en": "Introduction to Sales", "youtube_video_id": "7mbrTIzOObw", "duration": "10:00", "order": 1},
        {"course_id": "course-selling", "title_ar": "عروض الأسعار", "title_en": "Quotations", "youtube_video_id": "GqmyKHy0fWg", "duration": "12:30", "order": 2},
        {"course_id": "course-selling", "title_ar": "طلبات البيع", "title_en": "Sales Orders", "youtube_video_id": "XAPOh95I6xg", "duration": "11:15", "order": 3},
        {"course_id": "course-selling", "title_ar": "فواتير المبيعات", "title_en": "Sales Invoices", "youtube_video_id": "wmS6ydkfNyQ", "duration": "13:00", "order": 4},
        {"course_id": "course-selling", "title_ar": "تقارير المبيعات", "title_en": "Sales Reports", "youtube_video_id": "7n5H4411jIE", "duration": "9:45", "order": 5},
        # Buying Course
        {"course_id": "course-buying", "title_ar": "مقدمة في المشتريات", "title_en": "Introduction to Buying", "youtube_video_id": "iPw2hriKi_w", "duration": "11:00", "order": 1},
        {"course_id": "course-buying", "title_ar": "طلبات الشراء", "title_en": "Purchase Orders", "youtube_video_id": "2sUjqEWwObM", "duration": "13:30", "order": 2},
        {"course_id": "course-buying", "title_ar": "استلام المشتريات", "title_en": "Purchase Receipt", "youtube_video_id": "GqmyKHy0fWg", "duration": "10:45", "order": 3},
        {"course_id": "course-buying", "title_ar": "تقارير المشتريات", "title_en": "Purchase Reports", "youtube_video_id": "XAPOh95I6xg", "duration": "8:15", "order": 4},
        # Manufacturing Course
        {"course_id": "course-manufacturing", "title_ar": "مقدمة في التصنيع", "title_en": "Introduction to Manufacturing", "youtube_video_id": "FNZt7xaXK50", "duration": "15:00", "order": 1},
        {"course_id": "course-manufacturing", "title_ar": "قائمة المواد (BOM)", "title_en": "Bill of Materials (BOM)", "youtube_video_id": "GqmyKHy0fWg", "duration": "12:30", "order": 2},
        {"course_id": "course-manufacturing", "title_ar": "أوامر العمل", "title_en": "Work Orders", "youtube_video_id": "XAPOh95I6xg", "duration": "14:00", "order": 3},
        {"course_id": "course-manufacturing", "title_ar": "محطات العمل", "title_en": "Workstations", "youtube_video_id": "wmS6ydkfNyQ", "duration": "10:15", "order": 4},
        {"course_id": "course-manufacturing", "title_ar": "تخطيط الإنتاج", "title_en": "Production Planning", "youtube_video_id": "q_uwHy7666A", "duration": "13:45", "order": 5},
        {"course_id": "course-manufacturing", "title_ar": "تقارير التصنيع", "title_en": "Manufacturing Reports", "youtube_video_id": "7n5H4411jIE", "duration": "9:30", "order": 6},
        # CRM Course
        {"course_id": "course-crm", "title_ar": "مقدمة في CRM", "title_en": "Introduction to CRM", "youtube_video_id": "WHm7xrd4144", "duration": "10:00", "order": 1},
        {"course_id": "course-crm", "title_ar": "إدارة العملاء المحتملين", "title_en": "Lead Management", "youtube_video_id": "GqmyKHy0fWg", "duration": "11:30", "order": 2},
        {"course_id": "course-crm", "title_ar": "إدارة الفرص", "title_en": "Opportunity Management", "youtube_video_id": "XAPOh95I6xg", "duration": "9:45", "order": 3},
        {"course_id": "course-crm", "title_ar": "حملات التسويق", "title_en": "Marketing Campaigns", "youtube_video_id": "wmS6ydkfNyQ", "duration": "12:00", "order": 4},
        {"course_id": "course-crm", "title_ar": "تقارير CRM", "title_en": "CRM Reports", "youtube_video_id": "7n5H4411jIE", "duration": "8:15", "order": 5},
        # Payroll Course
        {"course_id": "course-payroll", "title_ar": "إعداد المرتبات", "title_en": "Payroll Setup", "youtube_video_id": "05JNvsOj9PM", "duration": "12:00", "order": 1},
        {"course_id": "course-payroll", "title_ar": "هياكل الرواتب", "title_en": "Salary Structures", "youtube_video_id": "GqmyKHy0fWg", "duration": "14:30", "order": 2},
        {"course_id": "course-payroll", "title_ar": "قسائم الرواتب", "title_en": "Payslip Generation", "youtube_video_id": "XAPOh95I6xg", "duration": "11:15", "order": 3},
        {"course_id": "course-payroll", "title_ar": "الخصومات والبدلات", "title_en": "Deductions & Allowances", "youtube_video_id": "wmS6ydkfNyQ", "duration": "10:00", "order": 4},
        {"course_id": "course-payroll", "title_ar": "تقارير المرتبات", "title_en": "Payroll Reports", "youtube_video_id": "7n5H4411jIE", "duration": "8:45", "order": 5},
        # Projects Course
        {"course_id": "course-projects", "title_ar": "تعريف المشروع", "title_en": "Project Definition", "youtube_video_id": "db7_PYMjdXI", "duration": "10:00", "order": 1},
        {"course_id": "course-projects", "title_ar": "إدارة المهام", "title_en": "Task Management", "youtube_video_id": "Sn1_yIkodlg", "duration": "12:30", "order": 2},
        {"course_id": "course-projects", "title_ar": "تكاليف المشروع", "title_en": "Project Costs", "youtube_video_id": "GqmyKHy0fWg", "duration": "9:15", "order": 3},
        # Education Course
        {"course_id": "course-education", "title_ar": "مقدمة في إدارة التعليم", "title_en": "Education Management Intro", "youtube_video_id": "ATiN1WmtIdk", "duration": "11:00", "order": 1},
        {"course_id": "course-education", "title_ar": "إدارة الطلاب", "title_en": "Student Management", "youtube_video_id": "U-IIUOrJVyE", "duration": "13:30", "order": 2},
        {"course_id": "course-education", "title_ar": "البرامج الدراسية", "title_en": "Academic Programs", "youtube_video_id": "GqmyKHy0fWg", "duration": "10:15", "order": 3},
        {"course_id": "course-education", "title_ar": "الجداول الدراسية", "title_en": "Course Scheduling", "youtube_video_id": "XAPOh95I6xg", "duration": "9:45", "order": 4},
        {"course_id": "course-education", "title_ar": "الرسوم والمحاسبة", "title_en": "Fees & Accounting", "youtube_video_id": "wmS6ydkfNyQ", "duration": "12:00", "order": 5},
        # Version 15 Course
        {"course_id": "course-v15", "title_ar": "نظرة عامة على الإصدار 15", "title_en": "Version 15 Overview", "youtube_video_id": "LXay5ftydIc", "duration": "5:00", "order": 1},
        {"course_id": "course-v15", "title_ar": "تسوية الدفعات في الخلفية", "title_en": "Background Payment Reconciliation", "youtube_video_id": "DGE9IfkmVs4", "duration": "3:10", "order": 2},
        {"course_id": "course-v15", "title_ar": "الدفعات غير المتساوية", "title_en": "Unequal Payments", "youtube_video_id": "9FCotFVX_yc", "duration": "2:08", "order": 3},
        {"course_id": "course-v15", "title_ar": "تخصيص الدفعات المقدمة تلقائيا", "title_en": "Auto Advance Payment Allocation", "youtube_video_id": "oPck1Dyasn4", "duration": "3:24", "order": 4},
        {"course_id": "course-v15", "title_ar": "تقارير حسابات الدائنين", "title_en": "Accounts Payable Reports", "youtube_video_id": "hBPL0T4C6Nw", "duration": "2:41", "order": 5},
        {"course_id": "course-v15", "title_ar": "تقرير نشاط الأصول", "title_en": "Asset Activity Report", "youtube_video_id": "E9IjE9748CI", "duration": "3:09", "order": 6},
    ]

    quizzes_data = [
        {
            "course_id": "course-intro",
            "title_ar": "اختبار المقدمة",
            "title_en": "Introduction Quiz",
            "passing_score": 60,
            "questions": [
                {"question_ar": "ما هو ERPNext؟", "question_en": "What is ERPNext?",
                 "options_ar": ["نظام محاسبة فقط", "نظام تخطيط موارد مؤسسات مفتوح المصدر", "نظام إدارة مشاريع", "برنامج تصميم"],
                 "options_en": ["Only accounting system", "Open-source ERP system", "Project management system", "Design software"],
                 "correct_answer_index": 1},
                {"question_ar": "ما لغة البرمجة المستخدمة في ERPNext؟", "question_en": "What programming language is ERPNext built with?",
                 "options_ar": ["Java", "Python", "C++", "Ruby"],
                 "options_en": ["Java", "Python", "C++", "Ruby"],
                 "correct_answer_index": 1},
                {"question_ar": "أين يتم إعداد بيانات الشركة؟", "question_en": "Where do you set up company data?",
                 "options_ar": ["إعدادات المخزون", "إعداد الشركة", "إعدادات المبيعات", "إعدادات الموارد البشرية"],
                 "options_en": ["Stock settings", "Company setup", "Sales settings", "HR settings"],
                 "correct_answer_index": 1},
                {"question_ar": "ما هو الفرق بين المستخدم والموظف في ERPNext؟", "question_en": "What is the difference between User and Employee in ERPNext?",
                 "options_ar": ["لا فرق", "المستخدم للدخول والموظف لبيانات HR", "الموظف للدخول والمستخدم لبيانات HR", "كلاهما للدخول"],
                 "options_en": ["No difference", "User for login, Employee for HR data", "Employee for login, User for HR data", "Both for login"],
                 "correct_answer_index": 1},
                {"question_ar": "ما هو Doctype في ERPNext؟", "question_en": "What is a Doctype in ERPNext?",
                 "options_ar": ["نوع مستند/نموذج في النظام", "ملف PDF", "تقرير", "إعداد"],
                 "options_en": ["A document/form type in the system", "A PDF file", "A report", "A setting"],
                 "correct_answer_index": 0}
            ]
        },
        {
            "course_id": "course-accounting",
            "title_ar": "اختبار المحاسبة",
            "title_en": "Accounting Quiz",
            "passing_score": 60,
            "questions": [
                {"question_ar": "ما هي شجرة الحسابات؟", "question_en": "What is the Chart of Accounts?",
                 "options_ar": ["قائمة الموظفين", "هيكل الحسابات المالية للشركة", "قائمة المنتجات", "تقرير المبيعات"],
                 "options_en": ["Employee list", "Financial account structure of company", "Product list", "Sales report"],
                 "correct_answer_index": 1},
                {"question_ar": "ما هو مركز التكلفة؟", "question_en": "What is a Cost Center?",
                 "options_ar": ["مخزن", "وحدة تنظيمية لتتبع التكاليف", "حساب بنكي", "فاتورة"],
                 "options_en": ["Warehouse", "Organizational unit for cost tracking", "Bank account", "Invoice"],
                 "correct_answer_index": 1},
                {"question_ar": "ما هو القيد اليومي؟", "question_en": "What is a Journal Entry?",
                 "options_ar": ["تقرير يومي", "عملية محاسبية يدوية", "فاتورة مبيعات", "طلب شراء"],
                 "options_en": ["Daily report", "Manual accounting transaction", "Sales invoice", "Purchase order"],
                 "correct_answer_index": 1},
                {"question_ar": "أي تقرير يعرض الأرباح والخسائر؟", "question_en": "Which report shows profit and loss?",
                 "options_ar": ["الميزانية العمومية", "قائمة الدخل", "تقرير المخزون", "تقرير الحضور"],
                 "options_en": ["Balance Sheet", "Income Statement / P&L", "Stock Report", "Attendance Report"],
                 "correct_answer_index": 1}
            ]
        },
        {
            "course_id": "course-stock",
            "title_ar": "اختبار إدارة المخازن",
            "title_en": "Stock Management Quiz",
            "passing_score": 60,
            "questions": [
                {"question_ar": "ما هو المستودع في ERPNext؟", "question_en": "What is a Warehouse in ERPNext?",
                 "options_ar": ["حساب مالي", "موقع تخزين البضائع", "نوع منتج", "تقرير"],
                 "options_en": ["Financial account", "Location for storing goods", "Product type", "Report"],
                 "correct_answer_index": 1},
                {"question_ar": "ما هو استلام المواد؟", "question_en": "What is a Material Receipt?",
                 "options_ar": ["بيع المنتجات", "استلام البضائع في المستودع", "نقل البضائع", "إرجاع"],
                 "options_en": ["Selling products", "Receiving goods in warehouse", "Transferring goods", "Return"],
                 "correct_answer_index": 1},
                {"question_ar": "كيف يتم تتبع حركة المخزون؟", "question_en": "How is stock movement tracked?",
                 "options_ar": ["يدوياً", "عبر Stock Ledger Entry", "عبر البريد الإلكتروني", "لا يتم تتبعها"],
                 "options_en": ["Manually", "Via Stock Ledger Entry", "Via email", "Not tracked"],
                 "correct_answer_index": 1}
            ]
        },
        {
            "course_id": "course-selling",
            "title_ar": "اختبار المبيعات",
            "title_en": "Sales Quiz",
            "passing_score": 60,
            "questions": [
                {"question_ar": "ما هو أول خطوة في دورة المبيعات؟", "question_en": "What is the first step in the sales cycle?",
                 "options_ar": ["فاتورة المبيعات", "عرض السعر", "التسليم", "الدفع"],
                 "options_en": ["Sales Invoice", "Quotation", "Delivery", "Payment"],
                 "correct_answer_index": 1},
                {"question_ar": "ما الفرق بين عرض السعر وطلب البيع؟", "question_en": "What's the difference between Quotation and Sales Order?",
                 "options_ar": ["لا فرق", "عرض السعر عرض والطلب تأكيد", "عرض السعر تأكيد والطلب عرض", "كلاهما فواتير"],
                 "options_en": ["No difference", "Quotation is offer, Order is confirmation", "Quotation is confirmation, Order is offer", "Both are invoices"],
                 "correct_answer_index": 1},
                {"question_ar": "متى يتم إنشاء فاتورة المبيعات؟", "question_en": "When is a Sales Invoice created?",
                 "options_ar": ["قبل عرض السعر", "بعد تأكيد الطلب والتسليم", "عند إنشاء العميل", "لا يتم إنشاؤها"],
                 "options_en": ["Before quotation", "After order confirmation and delivery", "When creating customer", "Never created"],
                 "correct_answer_index": 1}
            ]
        },
        {
            "course_id": "course-hr",
            "title_ar": "اختبار الموارد البشرية",
            "title_en": "HR Quiz",
            "passing_score": 60,
            "questions": [
                {"question_ar": "ما هو أول شيء يتم إنشاؤه في HR؟", "question_en": "What is created first in HR?",
                 "options_ar": ["الإجازة", "الموظف", "الراتب", "الحضور"],
                 "options_en": ["Leave", "Employee", "Salary", "Attendance"],
                 "correct_answer_index": 1},
                {"question_ar": "كيف يتم تتبع الحضور؟", "question_en": "How is attendance tracked?",
                 "options_ar": ["يدوياً فقط", "عبر نظام الحضور في ERPNext", "عبر البريد", "لا يتم تتبعه"],
                 "options_en": ["Manually only", "Via ERPNext attendance system", "Via email", "Not tracked"],
                 "correct_answer_index": 1},
                {"question_ar": "ما هو نوع الإجازة؟", "question_en": "What is a Leave Type?",
                 "options_ar": ["نوع الموظف", "تصنيف الإجازات (سنوية/مرضية)", "نوع الراتب", "نوع العقد"],
                 "options_en": ["Employee type", "Leave classification (annual/sick)", "Salary type", "Contract type"],
                 "correct_answer_index": 1}
            ]
        },
        {
            "course_id": "course-manufacturing",
            "title_ar": "اختبار التصنيع",
            "title_en": "Manufacturing Quiz",
            "passing_score": 60,
            "questions": [
                {"question_ar": "ما هو BOM؟", "question_en": "What is BOM?",
                 "options_ar": ["تقرير مالي", "قائمة المواد اللازمة للتصنيع", "طلب شراء", "فاتورة"],
                 "options_en": ["Financial report", "Bill of Materials for manufacturing", "Purchase order", "Invoice"],
                 "correct_answer_index": 1},
                {"question_ar": "ما هو أمر العمل؟", "question_en": "What is a Work Order?",
                 "options_ar": ["طلب إجازة", "أمر لتصنيع منتج", "فاتورة مبيعات", "طلب شراء"],
                 "options_en": ["Leave request", "Order to manufacture a product", "Sales invoice", "Purchase order"],
                 "correct_answer_index": 1},
                {"question_ar": "ما هي محطة العمل؟", "question_en": "What is a Workstation?",
                 "options_ar": ["كمبيوتر", "موقع إنتاج في المصنع", "مكتب إداري", "مستودع"],
                 "options_en": ["Computer", "Production location in factory", "Admin office", "Warehouse"],
                 "correct_answer_index": 1}
            ]
        },
        {
            "course_id": "course-crm",
            "title_ar": "اختبار إدارة علاقات العملاء",
            "title_en": "CRM Quiz",
            "passing_score": 60,
            "questions": [
                {"question_ar": "ما هو Lead في CRM؟", "question_en": "What is a Lead in CRM?",
                 "options_ar": ["عميل حالي", "عميل محتمل", "مورد", "موظف"],
                 "options_en": ["Existing customer", "Potential customer", "Supplier", "Employee"],
                 "correct_answer_index": 1},
                {"question_ar": "ما هي الفرصة (Opportunity)؟", "question_en": "What is an Opportunity?",
                 "options_ar": ["وظيفة شاغرة", "صفقة بيع محتملة", "مشروع", "فاتورة"],
                 "options_en": ["Job vacancy", "Potential sales deal", "Project", "Invoice"],
                 "correct_answer_index": 1},
                {"question_ar": "كيف يتم تحويل Lead إلى عميل؟", "question_en": "How is a Lead converted to Customer?",
                 "options_ar": ["تلقائياً", "عبر زر التحويل في نموذج Lead", "لا يمكن التحويل", "عبر البريد"],
                 "options_en": ["Automatically", "Via convert button in Lead form", "Cannot convert", "Via email"],
                 "correct_answer_index": 1}
            ]
        }
    ]

    # Insert all data
    for c in courses_data:
        course = Course(**c)
        doc = course.model_dump()
        await db.courses.insert_one(doc)

    for l in lessons_data:
        lesson = Lesson(**l)
        doc = lesson.model_dump()
        await db.lessons.insert_one(doc)

    for q in quizzes_data:
        quiz = Quiz(**q)
        doc = quiz.model_dump()
        await db.quizzes.insert_one(doc)

    return {"message": "Data seeded successfully", "courses": len(courses_data), "lessons": len(lessons_data), "quizzes": len(quizzes_data)}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    # Create indexes
    await db.courses.create_index("id", unique=True)
    await db.lessons.create_index("id", unique=True)
    await db.lessons.create_index("course_id")
    await db.quizzes.create_index("course_id")
    await db.certificates.create_index("id", unique=True)
    await db.certificates.create_index("certificate_code")
    logger.info("Database indexes created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
