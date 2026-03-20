#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class ERPNextArabicAPITester:
    def __init__(self, base_url="https://erp-mastery-arabic.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                    elif isinstance(response_data, dict):
                        print(f"   Response keys: {list(response_data.keys())}")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    'name': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:200]
                })

            return success, response.json() if success and response.text else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                'name': name,
                'error': str(e)
            })
            return False, {}

    def test_basic_endpoints(self):
        """Test basic API endpoints"""
        print("\n" + "="*50)
        print("TESTING BASIC API ENDPOINTS")
        print("="*50)
        
        # Test root endpoint
        self.run_test("API Root", "GET", "", 200)
        
        # Test stats endpoint
        success, stats = self.run_test("Stats Endpoint", "GET", "stats", 200)
        if success:
            print(f"   📊 Courses: {stats.get('courses_count', 'N/A')}")
            print(f"   📚 Lessons: {stats.get('lessons_count', 'N/A')}")
            print(f"   🏆 Certificates: {stats.get('certificates_issued', 'N/A')}")
            print(f"   👥 Students: {stats.get('students_count', 'N/A')}")

    def test_courses_endpoints(self):
        """Test courses-related endpoints"""
        print("\n" + "="*50)
        print("TESTING COURSES ENDPOINTS")
        print("="*50)
        
        # Get all courses
        success, courses = self.run_test("Get All Courses", "GET", "courses", 200)
        if success and courses:
            print(f"   Found {len(courses)} courses")
            
            # Test first course details
            first_course = courses[0]
            course_id = first_course.get('id')
            print(f"   Testing course: {first_course.get('title_en', 'N/A')}")
            
            # Get specific course
            success, course_detail = self.run_test(
                f"Get Course Details ({course_id})", 
                "GET", 
                f"courses/{course_id}", 
                200
            )
            
            if success:
                print(f"   📖 Lessons: {len(course_detail.get('lessons', []))}")
                print(f"   🧪 Has Quiz: {course_detail.get('has_quiz', False)}")
                
                # Test lessons endpoint
                self.run_test(
                    f"Get Course Lessons ({course_id})", 
                    "GET", 
                    f"courses/{course_id}/lessons", 
                    200
                )
                
                # Test quiz endpoint if available
                if course_detail.get('has_quiz'):
                    success, quiz = self.run_test(
                        f"Get Course Quiz ({course_id})", 
                        "GET", 
                        f"courses/{course_id}/quiz", 
                        200
                    )
                    
                    if success:
                        print(f"   🧪 Quiz questions: {len(quiz.get('questions', []))}")
                        print(f"   🎯 Passing score: {quiz.get('passing_score', 'N/A')}%")
                        
                        # Test quiz submission
                        answers = [0] * len(quiz.get('questions', []))  # All first options
                        self.run_test(
                            f"Submit Quiz ({course_id})", 
                            "POST", 
                            f"courses/{course_id}/quiz/submit", 
                            200,
                            {"answers": answers, "student_name": "Test Student"}
                        )
        
        # Test course filtering
        self.run_test("Filter Courses by Category", "GET", "courses?category=accounting", 200)
        self.run_test("Search Courses", "GET", "courses?search=ERPNext", 200)
        
        # Test categories endpoint
        self.run_test("Get Categories", "GET", "categories", 200)

    def test_certificates_endpoints(self):
        """Test certificate-related endpoints"""
        print("\n" + "="*50)
        print("TESTING CERTIFICATES ENDPOINTS")
        print("="*50)
        
        # Create a test certificate
        cert_data = {
            "course_id": "course-intro",
            "student_name": "Test Student",
            "quiz_score": 85
        }
        
        success, cert = self.run_test(
            "Create Certificate", 
            "POST", 
            "certificates", 
            200,
            cert_data
        )
        
        if success and cert:
            cert_id = cert.get('id')
            print(f"   📜 Certificate ID: {cert_id}")
            print(f"   🏆 Certificate Code: {cert.get('certificate_code', 'N/A')}")
            
            # Test getting the certificate
            self.run_test(
                f"Get Certificate ({cert_id})", 
                "GET", 
                f"certificates/{cert_id}", 
                200
            )
            
            # Test getting certificate by code
            cert_code = cert.get('certificate_code')
            if cert_code:
                self.run_test(
                    f"Get Certificate by Code ({cert_code})", 
                    "GET", 
                    f"certificates/{cert_code}", 
                    200
                )

    def test_admin_endpoints(self):
        """Test admin-related endpoints"""
        print("\n" + "="*50)
        print("TESTING ADMIN ENDPOINTS")
        print("="*50)
        
        # Test admin verification
        success, _ = self.run_test(
            "Admin Login (Correct Password)", 
            "POST", 
            "admin/verify", 
            200,
            {"password": "admin2024"}
        )
        
        # Test wrong password
        self.run_test(
            "Admin Login (Wrong Password)", 
            "POST", 
            "admin/verify", 
            401,
            {"password": "wrongpassword"}
        )
        
        if success:
            # Test admin courses endpoint
            self.run_test("Admin Get Courses", "GET", "admin/courses", 200)

    def test_data_seeding(self):
        """Test data seeding endpoint"""
        print("\n" + "="*50)
        print("TESTING DATA SEEDING")
        print("="*50)
        
        success, seed_result = self.run_test("Seed Data", "POST", "seed", 200)
        if success:
            print(f"   📚 Courses seeded: {seed_result.get('courses', 'N/A')}")
            print(f"   📖 Lessons seeded: {seed_result.get('lessons', 'N/A')}")
            print(f"   🧪 Quizzes seeded: {seed_result.get('quizzes', 'N/A')}")

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting ERPNext Arabic Learning Platform API Tests")
        print(f"🌐 Base URL: {self.base_url}")
        print(f"🔗 API URL: {self.api_url}")
        
        start_time = datetime.now()
        
        # Run test suites
        self.test_data_seeding()
        self.test_basic_endpoints()
        self.test_courses_endpoints()
        self.test_certificates_endpoints()
        self.test_admin_endpoints()
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        # Print results
        print("\n" + "="*60)
        print("📊 TEST RESULTS SUMMARY")
        print("="*60)
        print(f"✅ Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Tests failed: {len(self.failed_tests)}")
        print(f"⏱️  Duration: {duration:.2f} seconds")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for i, test in enumerate(self.failed_tests, 1):
                print(f"{i}. {test['name']}")
                if 'error' in test:
                    print(f"   Error: {test['error']}")
                else:
                    print(f"   Expected: {test['expected']}, Got: {test['actual']}")
                    if test.get('response'):
                        print(f"   Response: {test['response']}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n🎯 Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = ERPNextArabicAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())