# ERPNext Arabic Learning Platform - PRD

## Original Problem Statement
Build a highly professional educational course platform based on YouTube channel "ERPNext بالعربي" (@erpnextAR). Platform with real course data, embedded YouTube videos, quizzes, certificates, bilingual Arabic/English interface, admin dashboard.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Radix UI + Lucide icons
- **Backend**: FastAPI (Python) + Motor (async MongoDB)
- **Database**: MongoDB
- **No Authentication**: Progress tracked via localStorage

## User Personas
1. **Arabic ERP Learner**: Professional/student learning ERPNext in Arabic
2. **Platform Admin**: Manages courses, lessons, quizzes via admin dashboard

## Core Requirements
- Bilingual interface (Arabic RTL / English LTR)
- 12 courses with 66 lessons from real YouTube channel data
- 7 quizzes with real ERP-related questions
- Certificate generation upon quiz completion
- Admin dashboard with CRUD for courses/lessons
- YouTube video embedding with lazy loading
- Progress tracking via localStorage

## What's Been Implemented (Jan 2026)
- [x] Homepage with hero, stats, featured courses, features section
- [x] Courses catalog with search and category filtering (11 categories)
- [x] Course detail page with video preview, curriculum, progress bar
- [x] Lesson viewer with YouTube embed, prev/next navigation, mark complete
- [x] Quiz system with scoring, pass/fail, question review
- [x] Certificate generation and display with print support
- [x] Admin dashboard with password protection (admin2024)
- [x] Admin CRUD for courses and lessons
- [x] Language toggle (Arabic/English) with full RTL/LTR support
- [x] Dark theme with custom design system (Primary: #7079F7)
- [x] Seeded 12 real courses, 66 lessons, 7 quizzes from YouTube channel
- [x] 100% test pass rate (backend, frontend, integration)

## Tech Stack
- React 19, Tailwind CSS 3, React Router 7
- FastAPI, Motor 3.3, Pydantic 2
- MongoDB (local), no external APIs
- Fonts: Cairo (Arabic), Manrope (English)

## Backlog / P0-P2
### P0 (Critical)
- None remaining

### P1 (Important)
- Quiz management in admin (currently admin can only manage courses/lessons)
- Search courses by typing name
- Mobile responsive improvements

### P2 (Nice to have)
- Email certificate sharing
- Social sharing of completed courses
- User accounts for cross-device progress sync
- Discussion/comments on lessons
- Course rating system
- Advanced analytics dashboard

## Next Tasks
1. Admin quiz management (create/edit quiz questions)
2. Add more courses from remaining YouTube playlists
3. Enhanced mobile experience
