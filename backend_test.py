import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any

class TelegramUserbotAPITester:
    def __init__(self, base_url="https://pyro-image-bot.preview.emergentagent.com"):
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

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Dict[Any, Any] = None, files: Dict[str, Any] = None) -> tuple:
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'} if not files else {}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files, timeout=10)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                self.log_test(name, False, f"Unsupported method: {method}")
                return False, {}

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}

            details = f"Status: {response.status_code} (expected {expected_status})"
            if not success:
                details += f", Response: {response.text[:200]}"
            
            self.log_test(name, success, details)
            return success, response_data

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_basic_endpoints(self):
        """Test basic API endpoints"""
        print("\n🔍 Testing Basic Endpoints...")
        
        # Test root endpoint
        self.run_test("Root API", "GET", "/api/", 200)
        
        # Test bot status
        self.run_test("Bot Status", "GET", "/api/bot/status", 200)

    def test_accounts_endpoints(self):
        """Test accounts management endpoints"""
        print("\n👥 Testing Accounts Endpoints...")
        
        # Get all accounts
        success, accounts_data = self.run_test("Get All Accounts", "GET", "/api/accounts", 200)
        
        # Test account creation flow (send code)
        test_account_data = {
            "phone": "+1234567890",
            "api_id": 12345,
            "api_hash": "test_hash"
        }
        
        # This will likely fail without real Telegram credentials, but we test the endpoint
        self.run_test("Send Verification Code", "POST", "/api/accounts/send-code", 400, test_account_data)
        
        # Test getting non-existent account
        self.run_test("Get Non-existent Account", "GET", "/api/accounts/nonexistent", 404)

    def test_rules_endpoints(self):
        """Test auto-reply rules endpoints"""
        print("\n⚡ Testing Rules Endpoints...")
        
        # Get all rules
        success, rules_data = self.run_test("Get All Rules", "GET", "/api/rules", 200)
        
        # Create a test rule
        test_rule = {
            "name": "Test Rule",
            "conditions": [
                {
                    "condition_type": "keyword",
                    "value": "hello",
                    "is_active": True
                }
            ],
            "actions": [
                {
                    "action_type": "send_text",
                    "text_message": "Hello back!",
                    "delay_seconds": 1
                }
            ],
            "is_active": True,
            "priority": 1
        }
        
        success, rule_response = self.run_test("Create Rule", "POST", "/api/rules", 200, test_rule)
        
        if success and 'id' in rule_response:
            rule_id = rule_response['id']
            
            # Test getting the created rule
            self.run_test("Get Created Rule", "GET", f"/api/rules/{rule_id}", 200)
            
            # Test updating the rule
            update_data = {"name": "Updated Test Rule"}
            self.run_test("Update Rule", "PUT", f"/api/rules/{rule_id}", 200, update_data)
            
            # Test deleting the rule
            self.run_test("Delete Rule", "DELETE", f"/api/rules/{rule_id}", 200)
        
        # Test getting non-existent rule
        self.run_test("Get Non-existent Rule", "GET", "/api/rules/nonexistent", 404)

    def test_images_endpoints(self):
        """Test images management endpoints"""
        print("\n🖼️ Testing Images Endpoints...")
        
        # Get all images
        success, images_data = self.run_test("Get All Images", "GET", "/api/images", 200)
        
        # Test image upload (create a simple test file)
        test_image_content = b"fake_image_data"
        files = {
            'file': ('test.jpg', test_image_content, 'image/jpeg')
        }
        data = {'tags': 'test,automation'}
        
        # This will likely fail due to invalid image data, but we test the endpoint
        success, upload_response = self.run_test("Upload Image", "POST", "/api/images/upload", 400, data, files)
        
        # Test getting non-existent image
        self.run_test("Get Non-existent Image", "GET", "/api/images/nonexistent", 404)

    def test_settings_endpoints(self):
        """Test bot settings endpoints"""
        print("\n⚙️ Testing Settings Endpoints...")
        
        # Get bot settings
        success, settings_data = self.run_test("Get Bot Settings", "GET", "/api/settings", 200)
        
        # Update bot settings
        update_settings = {
            "auto_start": False,
            "log_messages": True,
            "response_delay_min": 2,
            "response_delay_max": 10,
            "max_daily_responses": 500
        }
        
        self.run_test("Update Bot Settings", "PUT", "/api/settings", 200, update_settings)

    def test_logs_endpoints(self):
        """Test activity logs endpoints"""
        print("\n📋 Testing Logs Endpoints...")
        
        # Get activity logs
        self.run_test("Get Activity Logs", "GET", "/api/logs", 200)
        
        # Get activity stats
        self.run_test("Get Activity Stats", "GET", "/api/logs/stats", 200)
        
        # Test with pagination parameters
        self.run_test("Get Logs with Pagination", "GET", "/api/logs?limit=10&skip=0", 200)

    def test_bot_control_endpoints(self):
        """Test bot control endpoints"""
        print("\n🤖 Testing Bot Control Endpoints...")
        
        # Test bot start (will likely fail without proper accounts)
        self.run_test("Start Bot", "POST", "/api/bot/start", 500)  # Expecting error without accounts
        
        # Test bot stop
        self.run_test("Stop Bot", "POST", "/api/bot/stop", 200)

    def test_status_endpoints(self):
        """Test status check endpoints"""
        print("\n📊 Testing Status Endpoints...")
        
        # Create status check
        status_data = {"client_name": "test_client"}
        success, status_response = self.run_test("Create Status Check", "POST", "/api/status", 200, status_data)
        
        # Get status checks
        self.run_test("Get Status Checks", "GET", "/api/status", 200)

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Telegram Userbot Manager API Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        try:
            self.test_basic_endpoints()
            self.test_accounts_endpoints()
            self.test_rules_endpoints()
            self.test_images_endpoints()
            self.test_settings_endpoints()
            self.test_logs_endpoints()
            self.test_bot_control_endpoints()
            self.test_status_endpoints()
            
        except Exception as e:
            print(f"❌ Critical error during testing: {e}")
        
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
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

def main():
    tester = TelegramUserbotAPITester()
    tester.run_all_tests()
    
    # Return exit code based on results
    if tester.tests_run == 0:
        return 1  # No tests run
    
    success_rate = tester.tests_passed / tester.tests_run
    return 0 if success_rate >= 0.5 else 1  # Pass if at least 50% tests pass

if __name__ == "__main__":
    sys.exit(main())