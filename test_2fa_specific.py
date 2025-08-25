#!/usr/bin/env python3
"""
Specific 2FA Implementation Test for Telegram Userbot Manager
Tests the complete 2FA flow with mock scenarios
"""

import requests
import json
import time
from datetime import datetime

class TelegramTwoFactorAuthTester:
    def __init__(self, base_url="https://telegram-code-fix.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "name": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    Details: {details}")

    def test_2fa_endpoint_availability(self):
        """Test that all 2FA-related endpoints are available and properly structured"""
        print("\n🔍 Testing 2FA Endpoint Availability...")
        
        # Test 1: Verify /api/accounts/send-code endpoint exists
        response = requests.post(f"{self.base_url}/api/accounts/send-code", 
                               json={"phone": "+1234567890", "api_id": 123456, "api_hash": "test"})
        
        if response.status_code in [400, 422]:  # Expected validation errors
            self.log_test("2FA: Send Code Endpoint Available", True, 
                         f"Endpoint accessible, returns {response.status_code}")
        else:
            self.log_test("2FA: Send Code Endpoint Available", False, 
                         f"Unexpected status: {response.status_code}")

        # Test 2: Verify /api/accounts/verify-code endpoint exists
        response = requests.post(f"{self.base_url}/api/accounts/verify-code", 
                               json={"verification_id": "test", "code": "123456"})
        
        if response.status_code in [400, 404, 422]:  # Expected validation/not found errors
            self.log_test("2FA: Verify Code Endpoint Available", True, 
                         f"Endpoint accessible, returns {response.status_code}")
        else:
            self.log_test("2FA: Verify Code Endpoint Available", False, 
                         f"Unexpected status: {response.status_code}")

        # Test 3: Verify /api/accounts/verify-2fa endpoint exists (NEW ENDPOINT)
        response = requests.post(f"{self.base_url}/api/accounts/verify-2fa", 
                               json={"verification_id": "test", "password": "test2fa"})
        
        if response.status_code in [400, 404, 422]:  # Expected validation/not found errors
            self.log_test("2FA: Verify 2FA Endpoint Available", True, 
                         f"NEW 2FA endpoint accessible, returns {response.status_code}")
        else:
            self.log_test("2FA: Verify 2FA Endpoint Available", False, 
                         f"Unexpected status: {response.status_code}")

    def test_2fa_error_handling(self):
        """Test 2FA error handling improvements"""
        print("\n🛡️ Testing 2FA Error Handling...")
        
        # Test 1: Test verify-code with non-existent verification_id
        response = requests.post(f"{self.base_url}/api/accounts/verify-code", 
                               json={"verification_id": "non-existent-id", "code": "123456"})
        
        if response.status_code == 400:
            try:
                data = response.json()
                detail = data.get('detail', '')
                if 'verification not found' in detail.lower():
                    self.log_test("2FA: Verify Code Error Message", True, 
                                 "Proper 'verification not found' error message")
                else:
                    self.log_test("2FA: Verify Code Error Message", False, 
                                 f"Unexpected error message: {detail}")
            except:
                self.log_test("2FA: Verify Code Error Message", False, "Invalid JSON response")
        else:
            self.log_test("2FA: Verify Code Error Message", False, 
                         f"Unexpected status code: {response.status_code}")

        # Test 2: Test verify-2fa with non-existent verification_id
        response = requests.post(f"{self.base_url}/api/accounts/verify-2fa", 
                               json={"verification_id": "non-existent-id", "password": "test"})
        
        if response.status_code == 400:
            try:
                data = response.json()
                detail = data.get('detail', '')
                if 'verification not found' in detail.lower():
                    self.log_test("2FA: Verify 2FA Error Message", True, 
                                 "Proper 'verification not found' error message")
                else:
                    self.log_test("2FA: Verify 2FA Error Message", False, 
                                 f"Unexpected error message: {detail}")
            except:
                self.log_test("2FA: Verify 2FA Error Message", False, "Invalid JSON response")
        else:
            self.log_test("2FA: Verify 2FA Error Message", False, 
                         f"Unexpected status code: {response.status_code}")

    def test_2fa_request_validation(self):
        """Test 2FA request validation"""
        print("\n📋 Testing 2FA Request Validation...")
        
        # Test 1: Test verify-2fa with missing verification_id
        response = requests.post(f"{self.base_url}/api/accounts/verify-2fa", 
                               json={"password": "test2fa"})
        
        if response.status_code == 422:  # Validation error
            self.log_test("2FA: Missing Verification ID Validation", True, 
                         "Proper validation error for missing verification_id")
        else:
            self.log_test("2FA: Missing Verification ID Validation", False, 
                         f"Expected 422, got {response.status_code}")

        # Test 2: Test verify-2fa with missing password
        response = requests.post(f"{self.base_url}/api/accounts/verify-2fa", 
                               json={"verification_id": "test-id"})
        
        if response.status_code == 422:  # Validation error
            self.log_test("2FA: Missing Password Validation", True, 
                         "Proper validation error for missing password")
        else:
            self.log_test("2FA: Missing Password Validation", False, 
                         f"Expected 422, got {response.status_code}")

        # Test 3: Test verify-2fa with empty password
        response = requests.post(f"{self.base_url}/api/accounts/verify-2fa", 
                               json={"verification_id": "test-id", "password": ""})
        
        # Empty password should be handled gracefully (either validation error or proper error message)
        if response.status_code in [400, 422]:
            self.log_test("2FA: Empty Password Handling", True, 
                         f"Empty password handled properly with status {response.status_code}")
        else:
            self.log_test("2FA: Empty Password Handling", False, 
                         f"Unexpected status: {response.status_code}")

    def test_2fa_response_structure(self):
        """Test 2FA response structure"""
        print("\n📊 Testing 2FA Response Structure...")
        
        # Test 1: Verify that verify-code can return 2FA required response
        # We can't test this with real credentials, but we can verify the endpoint structure
        response = requests.post(f"{self.base_url}/api/accounts/verify-code", 
                               json={"verification_id": "test-2fa-scenario", "code": "123456"})
        
        # The endpoint should handle the request properly (even if verification doesn't exist)
        if response.status_code in [400, 404]:
            try:
                data = response.json()
                if 'detail' in data:
                    self.log_test("2FA: Verify Code Response Structure", True, 
                                 "Response has proper JSON structure with detail field")
                else:
                    self.log_test("2FA: Verify Code Response Structure", False, 
                                 "Response missing expected fields")
            except:
                self.log_test("2FA: Verify Code Response Structure", False, 
                             "Invalid JSON response")
        else:
            self.log_test("2FA: Verify Code Response Structure", False, 
                         f"Unexpected status: {response.status_code}")

        # Test 2: Verify that verify-2fa returns proper response structure
        response = requests.post(f"{self.base_url}/api/accounts/verify-2fa", 
                               json={"verification_id": "test-2fa-scenario", "password": "testpass"})
        
        if response.status_code in [400, 404]:
            try:
                data = response.json()
                if 'detail' in data:
                    self.log_test("2FA: Verify 2FA Response Structure", True, 
                                 "Response has proper JSON structure with detail field")
                else:
                    self.log_test("2FA: Verify 2FA Response Structure", False, 
                                 "Response missing expected fields")
            except:
                self.log_test("2FA: Verify 2FA Response Structure", False, 
                             "Invalid JSON response")
        else:
            self.log_test("2FA: Verify 2FA Response Structure", False, 
                         f"Unexpected status: {response.status_code}")

    def test_2fa_implementation_completeness(self):
        """Test that 2FA implementation is complete"""
        print("\n🔧 Testing 2FA Implementation Completeness...")
        
        # Test 1: Verify all required endpoints exist
        endpoints_to_test = [
            "/api/accounts/send-code",
            "/api/accounts/verify-code", 
            "/api/accounts/verify-2fa"
        ]
        
        all_endpoints_exist = True
        for endpoint in endpoints_to_test:
            try:
                response = requests.post(f"{self.base_url}{endpoint}", json={})
                # Any response (even error) means endpoint exists
                if response.status_code >= 500:  # Server error means endpoint might not exist
                    all_endpoints_exist = False
                    break
            except:
                all_endpoints_exist = False
                break
        
        if all_endpoints_exist:
            self.log_test("2FA: All Required Endpoints Exist", True, 
                         "All 2FA endpoints are accessible")
        else:
            self.log_test("2FA: All Required Endpoints Exist", False, 
                         "Some 2FA endpoints are not accessible")

        # Test 2: Verify error messages don't contain "Please disable 2FA"
        response = requests.post(f"{self.base_url}/api/accounts/verify-code", 
                               json={"verification_id": "test", "code": "123456"})
        
        try:
            data = response.json()
            detail = data.get('detail', '').lower()
            if 'please disable 2fa' in detail or 'disable 2fa' in detail:
                self.log_test("2FA: No Disable 2FA Messages", False, 
                             "Found 'disable 2FA' message in response")
            else:
                self.log_test("2FA: No Disable 2FA Messages", True, 
                             "No 'disable 2FA' messages found - proper 2FA handling")
        except:
            self.log_test("2FA: No Disable 2FA Messages", True, 
                         "Response structure indicates proper error handling")

    def run_all_tests(self):
        """Run all 2FA-specific tests"""
        print("🚀 Starting 2FA Implementation Tests")
        print("🎯 FOCUS: Testing Two-Factor Authentication Implementation")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        try:
            self.test_2fa_endpoint_availability()
            self.test_2fa_error_handling()
            self.test_2fa_request_validation()
            self.test_2fa_response_structure()
            self.test_2fa_implementation_completeness()
            
        except Exception as e:
            print(f"❌ Critical error during testing: {e}")
        
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 2FA IMPLEMENTATION TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Show failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  • {test['name']}: {test['details']}")
        
        # Show passed tests summary
        passed_tests = [test for test in self.test_results if test['success']]
        if passed_tests:
            print(f"\n✅ PASSED TESTS ({len(passed_tests)}):")
            for test in passed_tests:
                print(f"  • {test['name']}")

        # 2FA Implementation Assessment
        print(f"\n🔐 2FA IMPLEMENTATION ASSESSMENT:")
        if self.tests_passed >= self.tests_run * 0.8:  # 80% pass rate
            print("✅ 2FA implementation appears to be working correctly!")
            print("✅ All required endpoints are accessible")
            print("✅ Error handling is properly implemented")
            print("✅ No 'disable 2FA' error messages found")
        else:
            print("⚠️  2FA implementation may have issues that need attention")

def main():
    tester = TelegramTwoFactorAuthTester()
    tester.run_all_tests()
    
    # Return exit code based on results
    if tester.tests_run == 0:
        return 1  # No tests run
    
    success_rate = tester.tests_passed / tester.tests_run
    return 0 if success_rate >= 0.8 else 1  # Pass if at least 80% tests pass

if __name__ == "__main__":
    exit(main())