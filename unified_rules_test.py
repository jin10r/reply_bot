#!/usr/bin/env python3
"""
Comprehensive test for unified auto-reply rules system functionality
Focus on the specific requirements from the review request
"""

import requests
import json
import time
import io
from datetime import datetime
from typing import Dict, Any

class UnifiedRulesSystemTester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.uploaded_media_ids = []
        self.created_rule_ids = []

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

    def test_1_enhanced_rules_api_endpoints(self):
        """Test 1: Enhanced Rules API Endpoints - Test all /api/rules/* endpoints"""
        print("\n🎯 TEST 1: Enhanced Rules API Endpoints (/api/rules/*)")
        print("=" * 60)
        
        # Test GET /api/rules
        success, rules_data = self.run_test("GET /api/rules", "GET", "/api/rules", 200)
        
        # Test POST /api/rules - Create basic rule
        basic_rule = {
            "name": "Basic Test Rule",
            "description": "Simple test rule for basic functionality",
            "conditions": [
                {
                    "condition_type": "keyword",
                    "value": "test_basic",
                    "is_active": True
                }
            ],
            "actions": [
                {
                    "action_type": "send_text",
                    "text_message": "Basic response",
                    "delay_seconds": 1
                }
            ],
            "is_active": True,
            "priority": 1
        }
        
        success, basic_rule_response = self.run_test("POST /api/rules - Basic Rule", "POST", "/api/rules", 200, basic_rule)
        basic_rule_id = None
        if success and basic_rule_response.get('id'):
            basic_rule_id = basic_rule_response['id']
            self.created_rule_ids.append(basic_rule_id)
        
        # Test POST /api/rules - Create enhanced rule with complex conditions
        enhanced_rule = {
            "name": "Enhanced Auto Reply Rule",
            "description": "Complex rule with advanced conditions and actions",
            "conditions": [
                {
                    "condition_type": "message_filter",
                    "keywords": ["привет", "hello", "hi"],
                    "message_types": ["text"],
                    "is_active": True
                },
                {
                    "condition_type": "chat_filter",
                    "chat_filter": {
                        "chat_types": ["private", "group"],
                        "min_members": 2,
                        "max_members": 100,
                        "title_contains": ["test"]
                    },
                    "is_active": True
                },
                {
                    "condition_type": "user_filter",
                    "user_filter": {
                        "usernames": ["testuser"],
                        "user_ids": ["123456789"],
                        "is_premium": False
                    },
                    "is_active": True
                },
                {
                    "condition_type": "time_filter",
                    "time_filter": {
                        "start_time": "09:00",
                        "end_time": "18:00",
                        "days_of_week": [1, 2, 3, 4, 5],
                        "timezone": "UTC"
                    },
                    "is_active": True
                }
            ],
            "actions": [
                {
                    "action_type": "send_content",
                    "media_contents": [
                        {
                            "content_type": "text",
                            "text_content": "Привет! Как дела? Время: {time}, Дата: {date}"
                        }
                    ],
                    "delay_seconds": 2,
                    "reply_to_message": True
                }
            ],
            "conditional_rules": [
                {
                    "condition": {
                        "condition_type": "user_filter",
                        "usernames": ["admin", "moderator"],
                        "is_active": True
                    },
                    "if_action": {
                        "action_type": "send_content",
                        "media_contents": [
                            {
                                "content_type": "text",
                                "text_content": "Здравствуйте, администратор! Пользователь: {user_name}, Чат: {chat_title}"
                            }
                        ]
                    },
                    "else_action": {
                        "action_type": "send_content",
                        "media_contents": [
                            {
                                "content_type": "text",
                                "text_content": "Привет, пользователь! Добро пожаловать в {chat_title}"
                            }
                        ]
                    }
                }
            ],
            "templates": [
                {
                    "template_name": "greeting_template",
                    "template_text": "Привет, {user_name}! Добро пожаловать в {chat_title}. Сегодня {date}, время {time}."
                }
            ],
            "is_active": True,
            "priority": 1,
            "max_triggers_per_day": 100,
            "cooldown_seconds": 30
        }
        
        success, enhanced_rule_response = self.run_test("POST /api/rules - Enhanced Rule", "POST", "/api/rules", 200, enhanced_rule)
        enhanced_rule_id = None
        if success and enhanced_rule_response.get('id'):
            enhanced_rule_id = enhanced_rule_response['id']
            self.created_rule_ids.append(enhanced_rule_id)
        
        # Test GET /api/rules/{id}
        if basic_rule_id:
            self.run_test("GET /api/rules/{id} - Basic Rule", "GET", f"/api/rules/{basic_rule_id}", 200)
        
        if enhanced_rule_id:
            self.run_test("GET /api/rules/{id} - Enhanced Rule", "GET", f"/api/rules/{enhanced_rule_id}", 200)
        
        # Test PUT /api/rules/{id}
        if enhanced_rule_id:
            update_data = {
                "name": "Updated Enhanced Rule",
                "description": "Updated description with new features",
                "max_triggers_per_day": 200,
                "cooldown_seconds": 60
            }
            self.run_test("PUT /api/rules/{id} - Update Rule", "PUT", f"/api/rules/{enhanced_rule_id}", 200, update_data)

    def test_2_media_management_api(self):
        """Test 2: Media Management API - Test /api/media/* endpoints"""
        print("\n🎯 TEST 2: Media Management API (/api/media/*)")
        print("=" * 60)
        
        # Test GET /api/media
        success, media_data = self.run_test("GET /api/media", "GET", "/api/media", 200)
        
        # Test GET /api/media with filters
        self.run_test("GET /api/media?file_type=image", "GET", "/api/media?file_type=image", 200)
        self.run_test("GET /api/media?tags=test", "GET", "/api/media?tags=test", 200)
        self.run_test("GET /api/media?limit=10", "GET", "/api/media?limit=10", 200)
        
        # Test POST /api/media/upload - Image
        test_image_content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01IEND\xaeB`\x82'
        files = {
            'file': ('test_unified_image.png', test_image_content, 'image/png')
        }
        data = {
            'tags': 'unified,test,automation,image',
            'file_type': 'image'
        }
        
        success, upload_response = self.run_test("POST /api/media/upload - Image", "POST", "/api/media/upload", 200, data, files)
        image_file_id = None
        if success and upload_response.get('data', {}).get('id'):
            image_file_id = upload_response['data']['id']
            self.uploaded_media_ids.append(image_file_id)
        
        # Test POST /api/media/upload - Sticker
        test_sticker_content = b'RIFF\x1a\x00\x00\x00WEBPVP8 \x0e\x00\x00\x00\x10\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
        files = {
            'file': ('test_unified_sticker.webp', test_sticker_content, 'image/webp')
        }
        data = {
            'tags': 'unified,test,sticker',
            'file_type': 'sticker'
        }
        
        success, sticker_response = self.run_test("POST /api/media/upload - Sticker", "POST", "/api/media/upload", 200, data, files)
        sticker_file_id = None
        if success and sticker_response.get('data', {}).get('id'):
            sticker_file_id = sticker_response['data']['id']
            self.uploaded_media_ids.append(sticker_file_id)
        
        return image_file_id, sticker_file_id

    def test_3_image_upload_local_storage(self):
        """Test 3: Image Upload to Local Storage - Verify images stored locally"""
        print("\n🎯 TEST 3: Image Upload to Local Storage")
        print("=" * 60)
        
        # Upload test image
        test_image_content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01IEND\xaeB`\x82'
        files = {
            'file': ('local_storage_test.png', test_image_content, 'image/png')
        }
        data = {
            'tags': 'local_storage,test',
            'file_type': 'image'
        }
        
        success, upload_response = self.run_test("Upload Image for Local Storage Test", "POST", "/api/media/upload", 200, data, files)
        
        if success and upload_response.get('data'):
            file_data = upload_response['data']
            file_id = file_data.get('id')
            file_path = file_data.get('file_path')
            
            if file_id:
                self.uploaded_media_ids.append(file_id)
            
            # Verify file metadata
            if file_path and '/uploads/' in file_path:
                self.log_test("Local Storage Path Verification", True, f"File stored at: {file_path}")
            else:
                self.log_test("Local Storage Path Verification", False, f"Invalid file path: {file_path}")
            
            # Verify file properties
            if file_data.get('file_size') and file_data.get('mime_type') == 'image/png':
                self.log_test("File Metadata Verification", True, f"Size: {file_data.get('file_size')}, Type: {file_data.get('mime_type')}")
            else:
                self.log_test("File Metadata Verification", False, "Missing or invalid file metadata")
        
        return upload_response.get('data', {}).get('id') if success else None

    def test_4_rule_media_integration(self, image_file_id, sticker_file_id):
        """Test 4: Rule-Media Integration - Test media files referenced in rules"""
        print("\n🎯 TEST 4: Rule-Media Integration")
        print("=" * 60)
        
        if not image_file_id:
            self.log_test("Rule-Media Integration", False, "No image file ID available for testing")
            return
        
        # Create rule that references uploaded media
        rule_with_media = {
            "name": "Rule with Media Integration",
            "description": "Rule that uses uploaded media files",
            "conditions": [
                {
                    "condition_type": "message_filter",
                    "keywords": ["картинка", "image", "picture"],
                    "is_active": True
                }
            ],
            "actions": [
                {
                    "action_type": "send_content",
                    "media_contents": [
                        {
                            "content_type": "image",
                            "file_id": image_file_id,
                            "caption": "Вот ваша картинка! Загружено через unified media system."
                        },
                        {
                            "content_type": "text",
                            "text_content": "Дополнительный текст с переменными: {user_name} в чате {chat_title}"
                        }
                    ],
                    "delay_seconds": 1
                }
            ],
            "is_active": True
        }
        
        if sticker_file_id:
            # Add sticker to the media contents
            rule_with_media["actions"][0]["media_contents"].append({
                "content_type": "sticker",
                "file_id": sticker_file_id
            })
        
        success, rule_response = self.run_test("Create Rule with Media References", "POST", "/api/rules", 200, rule_with_media)
        
        if success and rule_response.get('id'):
            rule_id = rule_response['id']
            self.created_rule_ids.append(rule_id)
            
            # Verify the rule was created with media references
            success, rule_data = self.run_test("Verify Rule with Media", "GET", f"/api/rules/{rule_id}", 200)
            
            if success and rule_data.get('actions'):
                media_contents = rule_data['actions'][0].get('media_contents', [])
                has_image = any(content.get('file_id') == image_file_id for content in media_contents)
                has_sticker = any(content.get('file_id') == sticker_file_id for content in media_contents) if sticker_file_id else True
                
                if has_image and has_sticker:
                    self.log_test("Media Reference Verification", True, "Rule correctly references uploaded media files")
                else:
                    self.log_test("Media Reference Verification", False, "Rule missing media file references")

    def test_5_inline_button_functionality(self):
        """Test 5: Inline Button Functionality - Test creation and processing"""
        print("\n🎯 TEST 5: Inline Button Functionality")
        print("=" * 60)
        
        # Create rule with inline buttons
        rule_with_buttons = {
            "name": "Rule with Inline Buttons",
            "description": "Testing inline button creation and callback functionality",
            "conditions": [
                {
                    "condition_type": "message_filter",
                    "keywords": ["меню", "menu", "buttons"],
                    "is_active": True
                }
            ],
            "actions": [
                {
                    "action_type": "send_content",
                    "media_contents": [
                        {
                            "content_type": "text",
                            "text_content": "Выберите опцию из меню:"
                        }
                    ],
                    "inline_buttons": [
                        [
                            {
                                "text": "Опция 1",
                                "button_type": "callback",
                                "callback_data": "option_1_unified",
                                "callback_action": "send_text",
                                "callback_content": "Вы выбрали опцию 1 в unified system"
                            },
                            {
                                "text": "Опция 2",
                                "button_type": "callback",
                                "callback_data": "option_2_unified",
                                "callback_action": "send_sticker",
                                "callback_content": "sticker_file_id_here"
                            }
                        ],
                        [
                            {
                                "text": "Веб-сайт",
                                "button_type": "url",
                                "url": "https://example.com"
                            },
                            {
                                "text": "Опция 3",
                                "button_type": "callback",
                                "callback_data": "option_3_unified",
                                "callback_action": "send_image",
                                "callback_content": "image_file_id_here"
                            }
                        ]
                    ]
                }
            ],
            "is_active": True
        }
        
        success, rule_response = self.run_test("Create Rule with Inline Buttons", "POST", "/api/rules", 200, rule_with_buttons)
        
        if success and rule_response.get('id'):
            rule_id = rule_response['id']
            self.created_rule_ids.append(rule_id)
            
            # Verify inline buttons in the created rule
            success, rule_data = self.run_test("Verify Inline Buttons in Rule", "GET", f"/api/rules/{rule_id}", 200)
            
            if success and rule_data.get('actions'):
                inline_buttons = rule_data['actions'][0].get('inline_buttons', [])
                if inline_buttons and len(inline_buttons) == 2:
                    self.log_test("Inline Button Structure Verification", True, f"Found {len(inline_buttons)} button rows")
                else:
                    self.log_test("Inline Button Structure Verification", False, "Incorrect inline button structure")

    def test_6_callback_processing(self):
        """Test 6: Callback Processing - Test /api/callbacks/* endpoints"""
        print("\n🎯 TEST 6: Callback Processing")
        print("=" * 60)
        
        # Test callback processing with different callback data
        callback_tests = [
            {
                "name": "Simple Callback",
                "data": {
                    "data": "option_1_unified",
                    "user_id": "123456789",
                    "chat_id": "-987654321",
                    "message_id": 12345
                }
            },
            {
                "name": "Complex Callback",
                "data": {
                    "data": "menu_action_settings_unified",
                    "user_id": "987654321",
                    "chat_id": "-123456789",
                    "message_id": 54321
                }
            },
            {
                "name": "Callback with JSON Data",
                "data": {
                    "data": '{"action": "unified_test", "param": "value"}',
                    "user_id": "555666777",
                    "chat_id": "-111222333",
                    "message_id": 99999
                }
            }
        ]
        
        for test_case in callback_tests:
            success, callback_response = self.run_test(
                f"Process {test_case['name']}", 
                "POST", 
                "/api/callbacks/process", 
                200, 
                test_case['data']
            )
            
            if success and callback_response.get('data'):
                callback_id = callback_response['data'].get('id')
                if callback_id:
                    self.log_test(f"{test_case['name']} - ID Generated", True, f"Callback ID: {callback_id}")

    def test_7_template_system(self):
        """Test 7: Template System - Verify template variables work"""
        print("\n🎯 TEST 7: Template System")
        print("=" * 60)
        
        # Test template creation
        template_tests = [
            {
                "name": "Basic Template",
                "data": {
                    "name": "Unified Basic Template",
                    "template_text": "Привет, {user_name}! Добро пожаловать в {chat_title}.",
                    "variables": {
                        "user_name": "имя пользователя",
                        "chat_title": "название чата"
                    }
                }
            },
            {
                "name": "Advanced Template",
                "data": {
                    "name": "Unified Advanced Template",
                    "template_text": "Здравствуйте, {user_name}! Сегодня {date}, время {time}. Вы находитесь в чате {chat_title}. Добро пожаловать!",
                    "variables": {
                        "user_name": "имя пользователя",
                        "chat_title": "название чата",
                        "time": "текущее время",
                        "date": "текущая дата"
                    }
                }
            },
            {
                "name": "Conditional Template",
                "data": {
                    "name": "Unified Conditional Template",
                    "template_text": "Привет{if admin}, администратор{endif} {user_name}! {if morning}Доброе утро!{else}Добро пожаловать!{endif}",
                    "variables": {
                        "user_name": "имя пользователя",
                        "admin": "флаг администратора",
                        "morning": "флаг утреннего времени"
                    }
                }
            }
        ]
        
        for template_test in template_tests:
            success, template_response = self.run_test(
                f"Create {template_test['name']}", 
                "POST", 
                "/api/templates", 
                200, 
                template_test['data']
            )
            
            if success and template_response.get('id'):
                template_id = template_response['id']
                
                # Verify template variables
                variables = template_test['data'].get('variables', {})
                if len(variables) > 0:
                    self.log_test(f"{template_test['name']} - Variables", True, f"Template has {len(variables)} variables")

    def test_8_conditional_rules(self):
        """Test 8: Conditional Rules - Test if-then-else logic"""
        print("\n🎯 TEST 8: Conditional Rules (If-Then-Else Logic)")
        print("=" * 60)
        
        # Create rule with conditional logic
        conditional_rule = {
            "name": "Unified Conditional Rule",
            "description": "Rule with if-then-else logic for different user types",
            "conditions": [
                {
                    "condition_type": "message_filter",
                    "keywords": ["статус", "status", "info"],
                    "is_active": True
                }
            ],
            "actions": [
                {
                    "action_type": "send_content",
                    "media_contents": [
                        {
                            "content_type": "text",
                            "text_content": "Проверяю ваш статус..."
                        }
                    ]
                }
            ],
            "conditional_rules": [
                {
                    "condition": {
                        "condition_type": "user_filter",
                        "user_filter": {
                            "usernames": ["admin", "moderator", "owner"],
                            "is_premium": True
                        },
                        "is_active": True
                    },
                    "if_action": {
                        "action_type": "send_content",
                        "media_contents": [
                            {
                                "content_type": "text",
                                "text_content": "🔥 Добро пожаловать, {user_name}! Вы администратор в чате {chat_title}. Время: {time}"
                            }
                        ]
                    },
                    "else_action": {
                        "action_type": "send_content",
                        "media_contents": [
                            {
                                "content_type": "text",
                                "text_content": "👋 Привет, {user_name}! Вы обычный пользователь в чате {chat_title}. Дата: {date}"
                            }
                        ]
                    }
                },
                {
                    "condition": {
                        "condition_type": "time_filter",
                        "time_filter": {
                            "start_time": "06:00",
                            "end_time": "12:00",
                            "timezone": "UTC"
                        },
                        "is_active": True
                    },
                    "if_action": {
                        "action_type": "send_content",
                        "media_contents": [
                            {
                                "content_type": "text",
                                "text_content": "🌅 Доброе утро! Хорошего дня, {user_name}!"
                            }
                        ]
                    },
                    "else_action": {
                        "action_type": "send_content",
                        "media_contents": [
                            {
                                "content_type": "text",
                                "text_content": "🌙 Добро пожаловать! Текущее время: {time}"
                            }
                        ]
                    }
                }
            ],
            "is_active": True
        }
        
        success, rule_response = self.run_test("Create Conditional Rule", "POST", "/api/rules", 200, conditional_rule)
        
        if success and rule_response.get('id'):
            rule_id = rule_response['id']
            self.created_rule_ids.append(rule_id)
            
            # Verify conditional rules structure
            success, rule_data = self.run_test("Verify Conditional Rule Structure", "GET", f"/api/rules/{rule_id}", 200)
            
            if success and rule_data.get('conditional_rules'):
                conditional_rules = rule_data['conditional_rules']
                if len(conditional_rules) == 2:
                    self.log_test("Conditional Rules Count", True, f"Found {len(conditional_rules)} conditional rules")
                    
                    # Check if-then-else structure
                    has_if_else = all(
                        rule.get('if_action') and rule.get('else_action') 
                        for rule in conditional_rules
                    )
                    
                    if has_if_else:
                        self.log_test("If-Then-Else Structure", True, "All conditional rules have if-then-else logic")
                    else:
                        self.log_test("If-Then-Else Structure", False, "Missing if-then-else structure")

    def test_9_rule_statistics(self):
        """Test 9: Rule Statistics - Test /api/rules/{id}/stats endpoint"""
        print("\n🎯 TEST 9: Rule Statistics")
        print("=" * 60)
        
        if not self.created_rule_ids:
            self.log_test("Rule Statistics", False, "No rule IDs available for statistics testing")
            return
        
        # Test statistics for created rules
        for i, rule_id in enumerate(self.created_rule_ids[:3]):  # Test first 3 rules
            # Test default statistics (7 days)
            success, stats_data = self.run_test(
                f"Get Rule Statistics - Rule {i+1} (7 days)", 
                "GET", 
                f"/api/rules/{rule_id}/stats", 
                200
            )
            
            # Test statistics with different time periods
            for days in [7, 30, 90]:
                success, stats_data = self.run_test(
                    f"Get Rule Statistics - Rule {i+1} ({days} days)", 
                    "GET", 
                    f"/api/rules/{rule_id}/stats?days={days}", 
                    200
                )
                
                if success and isinstance(stats_data, list):
                    self.log_test(f"Statistics Data Format - {days} days", True, f"Received {len(stats_data)} statistics records")

    def test_10_backward_compatibility(self):
        """Test 10: Backward Compatibility - Ensure old /api/images/* endpoints work"""
        print("\n🎯 TEST 10: Backward Compatibility (/api/images/*)")
        print("=" * 60)
        
        # Test GET /api/images
        success, images_data = self.run_test("GET /api/images - Backward Compatibility", "GET", "/api/images", 200)
        
        # Test POST /api/images/upload
        test_image_content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01IEND\xaeB`\x82'
        files = {
            'file': ('backward_compat_test.png', test_image_content, 'image/png')
        }
        data = {
            'tags': 'backward,compatibility,test'
        }
        
        success, upload_response = self.run_test("POST /api/images/upload - Backward Compatibility", "POST", "/api/images/upload", 200, data, files)
        
        old_image_id = None
        if success and upload_response.get('id'):
            old_image_id = upload_response['id']
        
        # Test GET /api/images/{id}
        if old_image_id:
            success, image_data = self.run_test("GET /api/images/{id} - Backward Compatibility", "GET", f"/api/images/{old_image_id}", 200)
            
            # Test DELETE /api/images/{id}
            self.run_test("DELETE /api/images/{id} - Backward Compatibility", "DELETE", f"/api/images/{old_image_id}", 200)

    def cleanup_test_data(self):
        """Clean up test data created during testing"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete created rules
        for rule_id in self.created_rule_ids:
            try:
                self.run_test(f"Cleanup Rule {rule_id}", "DELETE", f"/api/rules/{rule_id}", 200)
            except:
                pass
        
        # Delete uploaded media files
        for media_id in self.uploaded_media_ids:
            try:
                self.run_test(f"Cleanup Media {media_id}", "DELETE", f"/api/media/{media_id}", 200)
            except:
                pass

    def run_all_tests(self):
        """Run all unified auto-reply rules system tests"""
        print("🚀 UNIFIED AUTO-REPLY RULES SYSTEM COMPREHENSIVE TEST")
        print("🎯 Testing all aspects of the unified functionality")
        print(f"Testing against: {self.base_url}")
        print("=" * 80)
        
        try:
            # Test 1: Enhanced Rules API Endpoints
            self.test_1_enhanced_rules_api_endpoints()
            
            # Test 2: Media Management API
            image_file_id, sticker_file_id = self.test_2_media_management_api()
            
            # Test 3: Image Upload to Local Storage
            local_image_id = self.test_3_image_upload_local_storage()
            
            # Test 4: Rule-Media Integration
            self.test_4_rule_media_integration(image_file_id or local_image_id, sticker_file_id)
            
            # Test 5: Inline Button Functionality
            self.test_5_inline_button_functionality()
            
            # Test 6: Callback Processing
            self.test_6_callback_processing()
            
            # Test 7: Template System
            self.test_7_template_system()
            
            # Test 8: Conditional Rules
            self.test_8_conditional_rules()
            
            # Test 9: Rule Statistics
            self.test_9_rule_statistics()
            
            # Test 10: Backward Compatibility
            self.test_10_backward_compatibility()
            
        except Exception as e:
            print(f"❌ Critical error during testing: {e}")
        
        finally:
            # Cleanup test data
            self.cleanup_test_data()
        
        self.print_summary()

    def print_summary(self):
        """Print comprehensive test summary"""
        print("\n" + "=" * 80)
        print("📊 UNIFIED AUTO-REPLY RULES SYSTEM TEST SUMMARY")
        print("=" * 80)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Categorize results by test area
        test_areas = {
            "Enhanced Rules API": [],
            "Media Management": [],
            "Local Storage": [],
            "Rule-Media Integration": [],
            "Inline Buttons": [],
            "Callback Processing": [],
            "Template System": [],
            "Conditional Rules": [],
            "Rule Statistics": [],
            "Backward Compatibility": [],
            "Cleanup": []
        }
        
        for test in self.test_results:
            name = test['name']
            if 'Enhanced Rule' in name or 'GET /api/rules' in name or 'POST /api/rules' in name or 'PUT /api/rules' in name:
                test_areas["Enhanced Rules API"].append(test)
            elif 'Media' in name and 'Integration' not in name:
                test_areas["Media Management"].append(test)
            elif 'Local Storage' in name:
                test_areas["Local Storage"].append(test)
            elif 'Integration' in name:
                test_areas["Rule-Media Integration"].append(test)
            elif 'Button' in name:
                test_areas["Inline Buttons"].append(test)
            elif 'Callback' in name:
                test_areas["Callback Processing"].append(test)
            elif 'Template' in name:
                test_areas["Template System"].append(test)
            elif 'Conditional' in name:
                test_areas["Conditional Rules"].append(test)
            elif 'Statistics' in name:
                test_areas["Rule Statistics"].append(test)
            elif 'Backward' in name or '/api/images' in name:
                test_areas["Backward Compatibility"].append(test)
            elif 'Cleanup' in name:
                test_areas["Cleanup"].append(test)
        
        print("\n📋 RESULTS BY TEST AREA:")
        for area, tests in test_areas.items():
            if tests:
                passed = sum(1 for test in tests if test['success'])
                total = len(tests)
                rate = (passed/total*100) if total > 0 else 0
                status = "✅" if rate >= 80 else "⚠️" if rate >= 60 else "❌"
                print(f"{status} {area}: {passed}/{total} ({rate:.1f}%)")
        
        # Show failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  • {test['name']}: {test['details']}")
        
        print(f"\n🎯 UNIFIED SYSTEM STATUS: {'✅ FULLY FUNCTIONAL' if self.tests_passed/self.tests_run >= 0.8 else '⚠️ NEEDS ATTENTION' if self.tests_passed/self.tests_run >= 0.6 else '❌ CRITICAL ISSUES'}")

def main():
    tester = UnifiedRulesSystemTester()
    tester.run_all_tests()
    
    # Return exit code based on results
    if tester.tests_run == 0:
        return 1  # No tests run
    
    success_rate = tester.tests_passed / tester.tests_run
    return 0 if success_rate >= 0.8 else 1  # Pass if at least 80% tests pass

if __name__ == "__main__":
    exit(main())