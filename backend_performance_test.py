import requests
import sys
import json
import time
import gzip
import io
from datetime import datetime
from typing import Dict, Any, List
import threading
import concurrent.futures
import psutil
import os

class BackendPerformanceTester:
    def __init__(self, base_url="https://build-optimizer-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.performance_metrics = {}

    def log_test(self, name: str, success: bool, details: str = "", metrics: Dict = None):
        """Log test result with performance metrics"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "name": name,
            "success": success,
            "details": details,
            "metrics": metrics or {},
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    Details: {details}")
        if metrics:
            print(f"    Metrics: {metrics}")

    def measure_response_time(self, method: str, endpoint: str, data: Dict = None, files: Dict = None) -> tuple:
        """Measure response time and return response data"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'} if not files else {}
        
        start_time = time.time()
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return None, 0, {}

            end_time = time.time()
            response_time = (end_time - start_time) * 1000  # Convert to milliseconds
            
            response_data = {}
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}

            return response, response_time, response_data
        except Exception as e:
            end_time = time.time()
            response_time = (end_time - start_time) * 1000
            return None, response_time, {"error": str(e)}

    def test_cache_performance(self):
        """Test cache performance on frequently accessed endpoints"""
        print("\n🚀 Testing Cache Performance...")
        
        endpoints_to_test = [
            "/api/rules",
            "/api/media", 
            "/api/templates",
            "/api/logs",
            "/api/logs/stats"
        ]
        
        for endpoint in endpoints_to_test:
            print(f"\n📊 Testing cache performance for {endpoint}")
            
            # First request (cache miss)
            response1, time1, data1 = self.measure_response_time('GET', endpoint)
            
            # Small delay to ensure cache is set
            time.sleep(0.1)
            
            # Second request (should be cached)
            response2, time2, data2 = self.measure_response_time('GET', endpoint)
            
            # Third request (should still be cached)
            response3, time3, data3 = self.measure_response_time('GET', endpoint)
            
            if response1 and response2 and response3:
                # Calculate cache performance
                avg_cached_time = (time2 + time3) / 2
                cache_improvement = ((time1 - avg_cached_time) / time1) * 100 if time1 > 0 else 0
                
                # Cache is working if subsequent requests are faster
                cache_working = avg_cached_time < time1 or time1 < 100  # Very fast initial response also indicates cache
                
                metrics = {
                    "first_request_ms": round(time1, 2),
                    "second_request_ms": round(time2, 2), 
                    "third_request_ms": round(time3, 2),
                    "avg_cached_ms": round(avg_cached_time, 2),
                    "cache_improvement_percent": round(cache_improvement, 2)
                }
                
                success = cache_working and response1.status_code == 200
                details = f"Cache improvement: {cache_improvement:.1f}%" if cache_working else "Cache not working effectively"
                
                self.log_test(f"Cache Performance - {endpoint}", success, details, metrics)
            else:
                self.log_test(f"Cache Performance - {endpoint}", False, "Failed to get responses")

    def test_database_indexes_performance(self):
        """Test database query performance on indexed fields"""
        print("\n🗄️ Testing Database Indexes Performance...")
        
        # Test queries that should benefit from indexes
        test_queries = [
            ("/api/accounts", "Accounts by phone index"),
            ("/api/rules", "Rules by is_active and priority index"),
            ("/api/media?file_type=image", "Media by file_type index"),
            ("/api/media?tags=test", "Media by tags index"),
            ("/api/logs?limit=50", "Logs by timestamp index"),
        ]
        
        for endpoint, description in test_queries:
            print(f"\n📈 Testing {description}")
            
            # Run multiple requests to get average performance
            times = []
            for i in range(5):
                response, response_time, data = self.measure_response_time('GET', endpoint)
                if response and response.status_code == 200:
                    times.append(response_time)
                time.sleep(0.1)
            
            if times:
                avg_time = sum(times) / len(times)
                min_time = min(times)
                max_time = max(times)
                
                # Good performance is under 500ms for database queries
                good_performance = avg_time < 500
                
                metrics = {
                    "avg_response_ms": round(avg_time, 2),
                    "min_response_ms": round(min_time, 2),
                    "max_response_ms": round(max_time, 2),
                    "requests_tested": len(times)
                }
                
                details = f"Avg: {avg_time:.1f}ms, Range: {min_time:.1f}-{max_time:.1f}ms"
                self.log_test(f"DB Index Performance - {description}", good_performance, details, metrics)
            else:
                self.log_test(f"DB Index Performance - {description}", False, "No successful responses")

    def test_bulk_operations_performance(self):
        """Test bulk operations performance for media upload/management"""
        print("\n📦 Testing Bulk Operations Performance...")
        
        # Test concurrent media uploads
        print("\n📤 Testing concurrent media uploads...")
        
        def upload_test_file(file_index):
            """Upload a test file"""
            test_content = f"test_file_content_{file_index}".encode() * 100  # Make it larger
            files = {
                'file': (f'test_file_{file_index}.txt', test_content, 'text/plain')
            }
            data = {
                'tags': f'test,bulk,file{file_index}',
                'file_type': 'document'
            }
            
            start_time = time.time()
            try:
                response = requests.post(f"{self.base_url}/api/media/upload", data=data, files=files, timeout=30)
                end_time = time.time()
                return {
                    'success': response.status_code in [200, 201],
                    'time': (end_time - start_time) * 1000,
                    'status_code': response.status_code,
                    'file_index': file_index
                }
            except Exception as e:
                end_time = time.time()
                return {
                    'success': False,
                    'time': (end_time - start_time) * 1000,
                    'error': str(e),
                    'file_index': file_index
                }
        
        # Test with 5 concurrent uploads
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(upload_test_file, i) for i in range(5)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        successful_uploads = [r for r in results if r['success']]
        failed_uploads = [r for r in results if not r['success']]
        
        if successful_uploads:
            avg_upload_time = sum(r['time'] for r in successful_uploads) / len(successful_uploads)
            max_upload_time = max(r['time'] for r in successful_uploads)
            min_upload_time = min(r['time'] for r in successful_uploads)
            
            # Good bulk performance is under 2 seconds per upload on average
            good_performance = avg_upload_time < 2000 and len(successful_uploads) >= 3
            
            metrics = {
                "successful_uploads": len(successful_uploads),
                "failed_uploads": len(failed_uploads),
                "avg_upload_time_ms": round(avg_upload_time, 2),
                "min_upload_time_ms": round(min_upload_time, 2),
                "max_upload_time_ms": round(max_upload_time, 2)
            }
            
            details = f"{len(successful_uploads)}/{len(results)} uploads successful, avg: {avg_upload_time:.1f}ms"
            self.log_test("Bulk Upload Performance", good_performance, details, metrics)
        else:
            self.log_test("Bulk Upload Performance", False, "No successful uploads")
        
        # Test bulk media retrieval
        print("\n📥 Testing bulk media retrieval...")
        
        response, response_time, data = self.measure_response_time('GET', '/api/media?limit=50')
        if response and response.status_code == 200:
            try:
                media_count = len(data) if isinstance(data, list) else len(data.get('data', []))
                # Good performance for bulk retrieval
                good_performance = response_time < 1000  # Under 1 second
                
                metrics = {
                    "response_time_ms": round(response_time, 2),
                    "media_files_retrieved": media_count
                }
                
                details = f"Retrieved {media_count} files in {response_time:.1f}ms"
                self.log_test("Bulk Media Retrieval", good_performance, details, metrics)
            except Exception as e:
                self.log_test("Bulk Media Retrieval", False, f"Error parsing response: {e}")
        else:
            self.log_test("Bulk Media Retrieval", False, "Failed to retrieve media files")

    def test_error_handling_performance(self):
        """Test centralized error handling with invalid requests"""
        print("\n🚨 Testing Centralized Error Handling...")
        
        error_test_cases = [
            ("GET", "/api/nonexistent", 404, "Non-existent endpoint", None),
            ("GET", "/api/accounts/invalid-id", 404, "Invalid account ID", None),
            ("GET", "/api/rules/invalid-id", 404, "Invalid rule ID", None),
            ("GET", "/api/media/invalid-id", 404, "Invalid media ID", None),
            ("POST", "/api/rules", 422, "Invalid rule data", {"invalid": "data"}),
            ("POST", "/api/media/upload", 400, "Invalid file upload", {"invalid": "file"}),
            ("PUT", "/api/accounts/invalid", 404, "Update non-existent account", {"name": "test"}),
            ("DELETE", "/api/rules/invalid", 404, "Delete non-existent rule", None),
        ]
        
        error_response_times = []
        successful_error_handling = 0
        
        for method, endpoint, expected_status, description, data in error_test_cases:
            response, response_time, response_data = self.measure_response_time(method, endpoint, data)
            error_response_times.append(response_time)
            
            if response:
                # Check if error handling is working correctly
                correct_status = response.status_code == expected_status
                has_error_detail = 'detail' in response_data or 'error' in response_data
                fast_response = response_time < 1000  # Error responses should be fast
                
                success = correct_status and fast_response
                if success:
                    successful_error_handling += 1
                
                metrics = {
                    "response_time_ms": round(response_time, 2),
                    "status_code": response.status_code,
                    "expected_status": expected_status,
                    "has_error_detail": has_error_detail
                }
                
                details = f"Status: {response.status_code} (expected {expected_status}), Time: {response_time:.1f}ms"
                self.log_test(f"Error Handling - {description}", success, details, metrics)
            else:
                self.log_test(f"Error Handling - {description}", False, "No response received")
        
        # Overall error handling performance
        if error_response_times:
            avg_error_time = sum(error_response_times) / len(error_response_times)
            error_handling_efficiency = (successful_error_handling / len(error_test_cases)) * 100
            
            overall_success = error_handling_efficiency >= 70 and avg_error_time < 800
            
            metrics = {
                "avg_error_response_ms": round(avg_error_time, 2),
                "error_handling_efficiency_percent": round(error_handling_efficiency, 2),
                "successful_error_responses": successful_error_handling,
                "total_error_tests": len(error_test_cases)
            }
            
            details = f"Efficiency: {error_handling_efficiency:.1f}%, Avg time: {avg_error_time:.1f}ms"
            self.log_test("Overall Error Handling Performance", overall_success, details, metrics)

    def test_gzip_compression(self):
        """Test GZip compression is enabled and working"""
        print("\n🗜️ Testing GZip Compression...")
        
        endpoints_to_test = [
            "/api/rules",
            "/api/media",
            "/api/logs",
            "/api/templates"
        ]
        
        compression_working = 0
        
        for endpoint in endpoints_to_test:
            # Request with Accept-Encoding: gzip
            headers = {
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json'
            }
            
            try:
                response = requests.get(f"{self.base_url}{endpoint}", headers=headers, timeout=10)
                
                # Check if response is compressed
                content_encoding = response.headers.get('Content-Encoding', '')
                is_compressed = 'gzip' in content_encoding.lower()
                
                # Check response size
                content_length = len(response.content)
                
                # Try to decompress if gzipped
                if is_compressed:
                    try:
                        decompressed = gzip.decompress(response.content)
                        decompressed_length = len(decompressed)
                        compression_ratio = (1 - content_length / decompressed_length) * 100 if decompressed_length > 0 else 0
                    except:
                        decompressed_length = content_length
                        compression_ratio = 0
                else:
                    decompressed_length = content_length
                    compression_ratio = 0
                
                success = response.status_code == 200
                if success and (is_compressed or content_length < 1000):  # Small responses might not be compressed
                    compression_working += 1
                
                metrics = {
                    "compressed": is_compressed,
                    "content_encoding": content_encoding,
                    "compressed_size": content_length,
                    "decompressed_size": decompressed_length,
                    "compression_ratio_percent": round(compression_ratio, 2)
                }
                
                details = f"Compressed: {is_compressed}, Ratio: {compression_ratio:.1f}%" if is_compressed else "Not compressed"
                self.log_test(f"GZip Compression - {endpoint}", success, details, metrics)
                
            except Exception as e:
                self.log_test(f"GZip Compression - {endpoint}", False, f"Error: {e}")
        
        # Overall compression test
        compression_efficiency = (compression_working / len(endpoints_to_test)) * 100
        overall_success = compression_efficiency >= 50  # At least half should support compression
        
        metrics = {
            "compression_efficiency_percent": round(compression_efficiency, 2),
            "endpoints_with_compression": compression_working,
            "total_endpoints_tested": len(endpoints_to_test)
        }
        
        details = f"Compression working on {compression_working}/{len(endpoints_to_test)} endpoints"
        self.log_test("Overall GZip Compression", overall_success, details, metrics)

    def test_memory_usage_and_leaks(self):
        """Test for memory leaks and performance issues"""
        print("\n🧠 Testing Memory Usage and Performance...")
        
        # Get initial memory usage
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        print(f"Initial memory usage: {initial_memory:.2f} MB")
        
        # Perform intensive operations
        intensive_operations = [
            ("GET", "/api/rules"),
            ("GET", "/api/media"),
            ("GET", "/api/logs"),
            ("GET", "/api/templates"),
            ("GET", "/api/accounts"),
        ]
        
        # Run operations multiple times to test for memory leaks
        operation_times = []
        for round_num in range(10):  # 10 rounds of operations
            round_start = time.time()
            
            for method, endpoint in intensive_operations:
                response, response_time, data = self.measure_response_time(method, endpoint)
                operation_times.append(response_time)
            
            round_end = time.time()
            round_time = (round_end - round_start) * 1000
            
            # Check memory usage every few rounds
            if round_num % 3 == 0:
                current_memory = process.memory_info().rss / 1024 / 1024
                print(f"Round {round_num + 1} memory usage: {current_memory:.2f} MB")
        
        # Final memory check
        final_memory = process.memory_info().rss / 1024 / 1024
        memory_increase = final_memory - initial_memory
        
        # Performance consistency check
        if operation_times:
            avg_operation_time = sum(operation_times) / len(operation_times)
            # Check if performance degrades over time (sign of memory issues)
            first_half = operation_times[:len(operation_times)//2]
            second_half = operation_times[len(operation_times)//2:]
            
            first_half_avg = sum(first_half) / len(first_half) if first_half else 0
            second_half_avg = sum(second_half) / len(second_half) if second_half else 0
            
            performance_degradation = ((second_half_avg - first_half_avg) / first_half_avg * 100) if first_half_avg > 0 else 0
            
            # Good memory management: < 50MB increase, < 20% performance degradation
            good_memory_management = memory_increase < 50 and performance_degradation < 20
            
            metrics = {
                "initial_memory_mb": round(initial_memory, 2),
                "final_memory_mb": round(final_memory, 2),
                "memory_increase_mb": round(memory_increase, 2),
                "avg_operation_time_ms": round(avg_operation_time, 2),
                "performance_degradation_percent": round(performance_degradation, 2),
                "total_operations": len(operation_times)
            }
            
            details = f"Memory increase: {memory_increase:.1f}MB, Performance degradation: {performance_degradation:.1f}%"
            self.log_test("Memory Usage and Leak Test", good_memory_management, details, metrics)
        else:
            self.log_test("Memory Usage and Leak Test", False, "No operations completed")

    def test_concurrent_load_performance(self):
        """Test performance under concurrent load"""
        print("\n⚡ Testing Concurrent Load Performance...")
        
        def make_concurrent_request(endpoint):
            """Make a request and return timing info"""
            start_time = time.time()
            try:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                end_time = time.time()
                return {
                    'success': response.status_code == 200,
                    'time': (end_time - start_time) * 1000,
                    'status_code': response.status_code
                }
            except Exception as e:
                end_time = time.time()
                return {
                    'success': False,
                    'time': (end_time - start_time) * 1000,
                    'error': str(e)
                }
        
        # Test with 10 concurrent requests to different endpoints
        endpoints = ["/api/rules", "/api/media", "/api/logs", "/api/accounts", "/api/templates"] * 2
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_concurrent_request, endpoint) for endpoint in endpoints]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        successful_requests = [r for r in results if r['success']]
        failed_requests = [r for r in results if not r['success']]
        
        if successful_requests:
            avg_response_time = sum(r['time'] for r in successful_requests) / len(successful_requests)
            max_response_time = max(r['time'] for r in successful_requests)
            min_response_time = min(r['time'] for r in successful_requests)
            
            success_rate = (len(successful_requests) / len(results)) * 100
            
            # Good concurrent performance: >80% success rate, <2s average response
            good_performance = success_rate >= 80 and avg_response_time < 2000
            
            metrics = {
                "concurrent_requests": len(results),
                "successful_requests": len(successful_requests),
                "failed_requests": len(failed_requests),
                "success_rate_percent": round(success_rate, 2),
                "avg_response_time_ms": round(avg_response_time, 2),
                "min_response_time_ms": round(min_response_time, 2),
                "max_response_time_ms": round(max_response_time, 2)
            }
            
            details = f"Success rate: {success_rate:.1f}%, Avg time: {avg_response_time:.1f}ms"
            self.log_test("Concurrent Load Performance", good_performance, details, metrics)
        else:
            self.log_test("Concurrent Load Performance", False, "No successful concurrent requests")

    def run_performance_tests(self):
        """Run all performance tests"""
        print("🚀 Starting Backend Performance Tests")
        print("🎯 FOCUS: Testing Performance Optimizations (Caching, Indexing, Compression, Error Handling)")
        print(f"Testing against: {self.base_url}")
        print("=" * 80)
        
        try:
            # Core performance optimization tests
            self.test_cache_performance()
            self.test_database_indexes_performance()
            self.test_bulk_operations_performance()
            self.test_error_handling_performance()
            self.test_gzip_compression()
            self.test_memory_usage_and_leaks()
            self.test_concurrent_load_performance()
            
        except Exception as e:
            print(f"❌ Critical error during performance testing: {e}")
        
        self.print_performance_summary()

    def print_performance_summary(self):
        """Print performance test summary"""
        print("\n" + "=" * 80)
        print("📊 PERFORMANCE TEST SUMMARY")
        print("=" * 80)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Performance insights
        print("\n🔍 PERFORMANCE INSIGHTS:")
        
        # Cache performance
        cache_tests = [t for t in self.test_results if "Cache Performance" in t['name']]
        if cache_tests:
            cache_working = len([t for t in cache_tests if t['success']])
            print(f"  • Cache Performance: {cache_working}/{len(cache_tests)} endpoints showing cache benefits")
        
        # Database performance
        db_tests = [t for t in self.test_results if "DB Index Performance" in t['name']]
        if db_tests:
            fast_queries = len([t for t in db_tests if t['success']])
            print(f"  • Database Indexes: {fast_queries}/{len(db_tests)} queries performing well")
        
        # Error handling
        error_tests = [t for t in self.test_results if "Error Handling" in t['name']]
        if error_tests:
            good_error_handling = len([t for t in error_tests if t['success']])
            print(f"  • Error Handling: {good_error_handling}/{len(error_tests)} error scenarios handled efficiently")
        
        # Compression
        compression_tests = [t for t in self.test_results if "GZip Compression" in t['name']]
        if compression_tests:
            compressed_endpoints = len([t for t in compression_tests if t['success']])
            print(f"  • GZip Compression: {compressed_endpoints}/{len(compression_tests)} endpoints using compression")
        
        # Show failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print(f"\n❌ PERFORMANCE ISSUES FOUND ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  • {test['name']}: {test['details']}")
        
        # Show top performing areas
        passed_tests = [test for test in self.test_results if test['success']]
        if passed_tests:
            print(f"\n✅ OPTIMIZATIONS WORKING ({len(passed_tests)}):")
            for test in passed_tests:
                metrics_str = ""
                if test.get('metrics'):
                    key_metrics = []
                    for key, value in test['metrics'].items():
                        if 'time' in key.lower() or 'percent' in key.lower():
                            key_metrics.append(f"{key}: {value}")
                    if key_metrics:
                        metrics_str = f" ({', '.join(key_metrics[:2])})"
                print(f"  • {test['name']}{metrics_str}")

def main():
    tester = BackendPerformanceTester()
    tester.run_performance_tests()
    
    # Return exit code based on results
    if tester.tests_run == 0:
        return 1  # No tests run
    
    success_rate = tester.tests_passed / tester.tests_run
    return 0 if success_rate >= 0.6 else 1  # Pass if at least 60% tests pass

if __name__ == "__main__":
    sys.exit(main())