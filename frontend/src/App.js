import React, { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomePage from "@/pages/HomePage";
import CoursesPage from "@/pages/CoursesPage";
import CourseDetailPage from "@/pages/CourseDetailPage";
import LessonViewerPage from "@/pages/LessonViewerPage";
import QuizPage from "@/pages/QuizPage";
import CertificatePage from "@/pages/CertificatePage";
import AdminPage from "@/pages/AdminPage";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  useEffect(() => {
    // Seed data on first load
    axios.post(`${API}/seed`).catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-[#0A0A0A]">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/courses/:courseId" element={<CourseDetailPage />} />
            <Route path="/courses/:courseId/lesson/:lessonIndex" element={<LessonViewerPage />} />
            <Route path="/courses/:courseId/quiz" element={<QuizPage />} />
            <Route path="/certificate/:certId" element={<CertificatePage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
