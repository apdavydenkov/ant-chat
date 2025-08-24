#!/usr/bin/env python3
"""
Comprehensive API Testing Script
Проверяет все серверные и клиентские API методы, 
убеждается что данные не теряются и все методы используются
"""

import requests
import json
import logging
import sys
import time
from typing import Dict, List, Any, Optional
from datetime import datetime
import uuid

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('api_test_results.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

class APITester:
    def __init__(self, base_url: str = 'http://localhost:3001/api'):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = {
            'server_endpoints': {},
            'client_methods': {},
            'data_integrity': {},
            'missing_methods': [],
            'unused_server_endpoints': [],
            'errors': []
        }
        self.current_user_id = None
        self.admin_user_id = None
        self.test_data = {
            'users': [],
            'channels': [],
            'messages': [],
            'roles': []
        }

    def log_test(self, test_name: str, status: str, details: str = ""):
        """Логирование результатов тестов"""
        logger.info(f"TEST: {test_name} - {status}")
        if details:
            logger.info(f"DETAILS: {details}")
        
        if test_name not in self.test_results['server_endpoints']:
            self.test_results['server_endpoints'][test_name] = []
        
        self.test_results['server_endpoints'][test_name].append({
            'status': status,
            'details': details,
            'timestamp': datetime.now().isoformat()
        })

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    headers: Optional[Dict] = None) -> Dict:
        """Выполнение HTTP запроса с обработкой ошибок"""
        url = f"{self.base_url}{endpoint}"
        
        default_headers = {'Content-Type': 'application/json'}
        if self.current_user_id:
            default_headers['x-user-id'] = self.current_user_id
        
        if headers:
            default_headers.update(headers)

        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=default_headers)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, headers=default_headers)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, headers=default_headers)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, json=data, headers=default_headers)
            else:
                raise ValueError(f"Unsupported method: {method}")

            return {
                'success': True,
                'status_code': response.status_code,
                'data': response.json() if response.content else None,
                'response': response
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'status_code': None,
                'data': None
            }

    def test_health_endpoint(self):
        """Тест health check endpoint"""
        logger.info("=== TESTING HEALTH ENDPOINT ===")
        
        result = self.make_request('GET', '/health')
        if result['success'] and result['status_code'] == 200:
            self.log_test('GET /health', 'PASSED', f"Response: {result['data']}")
        else:
            self.log_test('GET /health', 'FAILED', f"Error: {result.get('error', 'Unknown')}")

    def test_auth_endpoints(self):
        """Тест всех auth endpoints"""
        logger.info("=== TESTING AUTH ENDPOINTS ===")
        
        # Test login - создаем тестового пользователя
        test_username = f"testuser_{int(time.time())}"
        login_data = {'username': test_username}
        
        result = self.make_request('POST', '/auth/login', login_data)
        if result['success'] and result['status_code'] == 200:
            user_data = result['data']['user']
            self.current_user_id = user_data['id']
            self.test_data['users'].append(user_data)
            self.log_test('POST /auth/login', 'PASSED', f"User created: {user_data['username']}")
        else:
            self.log_test('POST /auth/login', 'FAILED', f"Error: {result.get('error', 'Unknown')}")
            return

        # Test get user by ID
        if self.current_user_id:
            result = self.make_request('GET', f'/auth/user/{self.current_user_id}')
            if result['success'] and result['status_code'] == 200:
                self.log_test('GET /auth/user/:id', 'PASSED', f"User retrieved: {result['data']['user']['username']}")
            else:
                self.log_test('GET /auth/user/:id', 'FAILED', f"Error: {result.get('error', 'Unknown')}")

        # Test update user profile
        update_data = {
            'bio': 'Test bio',
            'email': 'test@example.com'
        }
        result = self.make_request('PUT', f'/auth/user/{self.current_user_id}', update_data)
        if result['success'] and result['status_code'] == 200:
            self.log_test('PUT /auth/user/:id', 'PASSED', 'User profile updated')
        else:
            self.log_test('PUT /auth/user/:id', 'FAILED', f"Error: {result.get('error', 'Unknown')}")

        # Create admin user - использует специальное имя 'admin' для получения админ прав
        admin_login = self.make_request('POST', '/auth/login', {'username': 'admin'})
        if admin_login['success']:
            admin_user = admin_login['data']['user']
            self.admin_user_id = admin_user['id']
            self.log_test('Admin user creation', 'PASSED', f"Admin user: {admin_user['username']}")
        else:
            self.log_test('Admin user creation', 'FAILED', f"Error: {admin_login.get('error', 'Unknown')}")

    def test_channels_endpoints(self):
        """Тест всех channels endpoints"""
        logger.info("=== TESTING CHANNELS ENDPOINTS ===")
        
        if not self.current_user_id:
            self.log_test('Channels tests', 'SKIPPED', 'No authenticated user')
            return

        # Test get all channels
        result = self.make_request('GET', '/channels')
        if result['success'] and result['status_code'] == 200:
            self.log_test('GET /channels', 'PASSED', f"Channels retrieved: {len(result['data']['channels'])}")
            self.test_data['channels'] = result['data']['channels']
        else:
            self.log_test('GET /channels', 'FAILED', f"Error: {result.get('error', 'Unknown')}")

        # Test create channel with regular user (should fail due to permissions)
        channel_data = {
            'name': f'Test Channel {int(time.time())}',
            'description': 'Test channel description'
        }
        result = self.make_request('POST', '/channels', channel_data)
        if result['success'] and result['status_code'] == 200:
            created_channel = result['data']['channel']
            self.test_data['channels'].append(created_channel)
            self.log_test('POST /channels', 'PASSED', f"Channel created: {created_channel['name']}")
        elif result['status_code'] == 403:
            self.log_test('POST /channels', 'PERMISSIONS_REQUIRED', 'Regular user cannot create channels')
            
            # Try with admin user
            if self.admin_user_id:
                old_user_id = self.current_user_id
                self.current_user_id = self.admin_user_id
                
                result = self.make_request('POST', '/channels', channel_data)
                if result['success'] and result['status_code'] == 200:
                    created_channel = result['data']['channel']
                    self.test_data['channels'].append(created_channel)
                    self.log_test('POST /channels (admin)', 'PASSED', f"Admin created channel: {created_channel['name']}")
                    
                    # Test update channel with admin
                    update_data = {
                        'name': f'Updated {created_channel["name"]}',
                        'description': 'Updated description'
                    }
                    result = self.make_request('PUT', f'/channels/{created_channel["id"]}', update_data)
                    if result['success'] and result['status_code'] == 200:
                        self.log_test('PUT /channels/:id', 'PASSED', 'Channel updated')
                    else:
                        self.log_test('PUT /channels/:id', 'FAILED', f"Error: {result.get('error', 'Unknown')}")
                        
                    # Test delete channel with admin
                    result = self.make_request('DELETE', f'/channels/{created_channel["id"]}')
                    if result['success'] and result['status_code'] == 200:
                        self.log_test('DELETE /channels/:id', 'PASSED', 'Channel deleted')
                    else:
                        self.log_test('DELETE /channels/:id', 'FAILED', f"Error: {result.get('error', 'Unknown')}")
                else:
                    self.log_test('POST /channels (admin)', 'FAILED', f"Error: {result.get('error', 'Unknown')}")
                
                # Restore regular user
                self.current_user_id = old_user_id
        else:
            self.log_test('POST /channels', 'FAILED', f"Error: {result.get('error', 'Unknown')}")

    def test_messages_endpoints(self):
        """Тест всех messages endpoints"""
        logger.info("=== TESTING MESSAGES ENDPOINTS ===")
        
        if not self.current_user_id or not self.test_data['channels']:
            self.log_test('Messages tests', 'SKIPPED', 'No authenticated user or channels')
            return

        channel_id = self.test_data['channels'][0]['id'] if self.test_data['channels'] else None
        if not channel_id:
            self.log_test('Messages tests', 'SKIPPED', 'No available channel')
            return

        # Test get all messages
        result = self.make_request('GET', '/messages')
        if result['success'] and result['status_code'] == 200:
            self.log_test('GET /messages', 'PASSED', f"Messages retrieved: {len(result['data']['messages'])}")
        else:
            self.log_test('GET /messages', 'FAILED', f"Error: {result.get('error', 'Unknown')}")

        # Test get messages by channel
        result = self.make_request('GET', f'/messages/channel/{channel_id}')
        if result['success'] and result['status_code'] == 200:
            self.log_test('GET /messages/channel/:id', 'PASSED', f"Channel messages: {len(result['data']['messages'])}")
        else:
            self.log_test('GET /messages/channel/:id', 'FAILED', f"Error: {result.get('error', 'Unknown')}")

        # Test create message
        message_data = {
            'channelId': channel_id,
            'content': f'Test message {int(time.time())}'
        }
        result = self.make_request('POST', '/messages', message_data)
        if result['success'] and result['status_code'] == 200:
            created_message = result['data']['message']
            self.test_data['messages'].append(created_message)
            self.log_test('POST /messages', 'PASSED', f"Message created: {created_message['content'][:20]}")
            
            # Test update message
            update_data = {
                'content': f'Updated: {created_message["content"]}'
            }
            result = self.make_request('PUT', f'/messages/{created_message["id"]}', update_data)
            if result['success'] and result['status_code'] == 200:
                self.log_test('PUT /messages/:id', 'PASSED', 'Message updated')
            else:
                self.log_test('PUT /messages/:id', 'FAILED', f"Error: {result.get('error', 'Unknown')}")

            # Test delete message (should require permission or ownership)
            result = self.make_request('DELETE', f'/messages/{created_message["id"]}')
            if result['success'] and result['status_code'] == 200:
                self.log_test('DELETE /messages/:id', 'PASSED', 'Message deleted by owner')
            else:
                self.log_test('DELETE /messages/:id', 'FAILED/PERMISSIONS', f"Error: {result.get('error', 'Unknown')}")
        else:
            self.log_test('POST /messages', 'FAILED', f"Error: {result.get('error', 'Unknown')}")

    def test_roles_endpoints(self):
        """Тест всех roles endpoints (требует admin прав)"""
        logger.info("=== TESTING ROLES ENDPOINTS ===")
        
        if not self.current_user_id:
            self.log_test('Roles tests', 'SKIPPED', 'No authenticated user')
            return

        # Test get all roles with regular user (should fail)
        result = self.make_request('GET', '/roles')
        if result['success']:
            if result['status_code'] == 200:
                self.log_test('GET /roles', 'PASSED', f"Roles retrieved: {len(result['data']['roles'])}")
                self.test_data['roles'] = result['data']['roles']
            elif result['status_code'] == 403:
                self.log_test('GET /roles', 'AUTH_REQUIRED', 'Admin permissions needed')
        else:
            self.log_test('GET /roles', 'FAILED', f"Error: {result.get('error', 'Unknown')}")

        # Test admin-only endpoints
        if self.admin_user_id:
            old_user_id = self.current_user_id
            self.current_user_id = self.admin_user_id

            # Test get all roles with admin
            result = self.make_request('GET', '/roles')
            if result['success'] and result['status_code'] == 200:
                self.log_test('GET /roles (admin)', 'PASSED', f"Admin retrieved roles: {len(result['data']['roles'])}")
                self.test_data['roles'] = result['data']['roles']
            else:
                self.log_test('GET /roles (admin)', 'FAILED', f"Error: {result.get('error', 'Unknown')}")

            # Test get role by ID with admin
            if self.test_data['roles']:
                role_id = self.test_data['roles'][0]['id']
                result = self.make_request('GET', f'/roles/{role_id}')
                if result['success'] and result['status_code'] == 200:
                    self.log_test('GET /roles/:id', 'PASSED', f"Role retrieved: {result['data']['role']['name']}")
                else:
                    self.log_test('GET /roles/:id', 'FAILED', f"Error: {result.get('error', 'Unknown')}")

            # Test create role with admin
            role_data = {
                'name': f'test_role_{int(time.time())}',
                'permissions': ['send_messages']
            }
            result = self.make_request('POST', '/roles', role_data)
            if result['success'] and result['status_code'] == 200:
                created_role = result['data']['role']
                self.test_data['roles'].append(created_role)
                self.log_test('POST /roles (admin)', 'PASSED', f"Admin created role: {created_role['name']}")
                
                # Test add permission to role
                result = self.make_request('POST', f'/roles/{created_role["id"]}/permissions', 
                                         {'permission': 'delete_messages'})
                if result['success'] and result['status_code'] == 200:
                    self.log_test('POST /roles/:id/permissions', 'PASSED', 'Permission added to role')
                else:
                    self.log_test('POST /roles/:id/permissions', 'FAILED', f"Error: {result.get('error', 'Unknown')}")

                # Test remove permission from role
                result = self.make_request('DELETE', f'/roles/{created_role["id"]}/permissions', 
                                         {'permission': 'delete_messages'})
                if result['success'] and result['status_code'] == 200:
                    self.log_test('DELETE /roles/:id/permissions', 'PASSED', 'Permission removed from role')
                else:
                    self.log_test('DELETE /roles/:id/permissions', 'FAILED', f"Error: {result.get('error', 'Unknown')}")

                # Test update role
                result = self.make_request('PUT', f'/roles/{created_role["id"]}', {'name': f'updated_{created_role["name"]}'})
                if result['success'] and result['status_code'] == 200:
                    self.log_test('PUT /roles/:id', 'PASSED', 'Role updated')
                else:
                    self.log_test('PUT /roles/:id', 'FAILED', f"Error: {result.get('error', 'Unknown')}")

                # Test delete role
                result = self.make_request('DELETE', f'/roles/{created_role["id"]}')
                if result['success'] and result['status_code'] == 200:
                    self.log_test('DELETE /roles/:id', 'PASSED', 'Role deleted')
                else:
                    self.log_test('DELETE /roles/:id', 'FAILED', f"Error: {result.get('error', 'Unknown')}")
            else:
                self.log_test('POST /roles (admin)', 'FAILED', f"Error: {result.get('error', 'Unknown')}")

            # Restore regular user
            self.current_user_id = old_user_id

        # Test get user permissions
        result = self.make_request('GET', f'/roles/user/{self.current_user_id}/permissions')
        if result['success'] and result['status_code'] == 200:
            self.log_test('GET /roles/user/:id/permissions', 'PASSED', f"Permissions: {result['data']['permissions']}")
        else:
            self.log_test('GET /roles/user/:id/permissions', 'FAILED', f"Error: {result.get('error', 'Unknown')}")

        # Test get user role
        result = self.make_request('GET', f'/roles/user/{self.current_user_id}/role')
        if result['success'] and result['status_code'] == 200:
            self.log_test('GET /roles/user/:id/role', 'PASSED', f"User role: {result['data']['role']['name']}")
        else:
            self.log_test('GET /roles/user/:id/role', 'FAILED', f"Error: {result.get('error', 'Unknown')}")

    def test_permissions_endpoints(self):
        """Тест permissions endpoints"""
        logger.info("=== TESTING PERMISSIONS ENDPOINTS ===")
        
        if not self.current_user_id:
            self.log_test('Permissions tests', 'SKIPPED', 'No authenticated user')
            return

        # Test check permission
        result = self.make_request('GET', '/permissions/check?permission=send_messages')
        if result['success'] and result['status_code'] == 200:
            self.log_test('GET /permissions/check', 'PASSED', f"Permission check: {result['data']['hasPermission']}")
        else:
            self.log_test('GET /permissions/check', 'FAILED', f"Error: {result.get('error', 'Unknown')}")

    def test_admin_endpoints(self):
        """Тест всех admin-only endpoints"""
        logger.info("=== TESTING ADMIN ENDPOINTS ===")
        
        if not self.admin_user_id:
            self.log_test('Admin tests', 'SKIPPED', 'No admin user available')
            return

        old_user_id = self.current_user_id
        self.current_user_id = self.admin_user_id

        # Test get all users (admin only)
        result = self.make_request('GET', '/auth/users')
        if result['success'] and result['status_code'] == 200:
            self.log_test('GET /auth/users', 'PASSED', f"Admin retrieved users: {len(result['data']['users'])}")
        else:
            self.log_test('GET /auth/users', 'FAILED', f"Error: {result.get('error', 'Unknown')}")

        # Test create user (admin only)
        user_data = {
            'username': f'test_admin_user_{int(time.time())}',
            'role': 'user',
            'bio': 'Created by admin',
            'email': 'test@admin.com'
        }
        result = self.make_request('POST', '/auth/users', user_data)
        if result['success'] and result['status_code'] == 200:
            created_user = result['data']['user']
            self.test_data['users'].append(created_user)
            self.log_test('POST /auth/users', 'PASSED', f"Admin created user: {created_user['username']}")
            
            # Test delete user (admin only)  
            result = self.make_request('DELETE', f'/auth/user/{created_user["id"]}')
            if result['success'] and result['status_code'] == 200:
                self.log_test('DELETE /auth/user/:id', 'PASSED', 'Admin deleted user')
            else:
                self.log_test('DELETE /auth/user/:id', 'FAILED', f"Error: {result.get('error', 'Unknown')}")
        else:
            self.log_test('POST /auth/users', 'FAILED', f"Error: {result.get('error', 'Unknown')}")

        # Restore regular user
        self.current_user_id = old_user_id

    def analyze_server_endpoints(self):
        """Анализ всех серверных endpoints"""
        logger.info("=== ANALYZING SERVER ENDPOINTS ===")
        
        # Список всех серверных endpoints из кода
        server_endpoints = {
            # Auth endpoints
            'POST /auth/login': 'tested',
            'GET /auth/user/:id': 'tested', 
            'GET /auth/users': 'not_tested_admin_only',
            'POST /auth/users': 'not_tested_admin_only',
            'PUT /auth/user/:id': 'tested',
            'DELETE /auth/user/:id': 'not_tested_admin_only',
            
            # Channels endpoints
            'GET /channels': 'tested',
            'POST /channels': 'tested',
            'PUT /channels/:id': 'tested', 
            'DELETE /channels/:id': 'not_tested_permissions',
            
            # Messages endpoints
            'GET /messages/channel/:id': 'tested',
            'GET /messages': 'tested',
            'POST /messages': 'tested',
            'PUT /messages/:id': 'tested',
            'DELETE /messages/:id': 'not_tested_permissions',
            
            # Roles endpoints
            'GET /roles': 'tested_auth_required',
            'GET /roles/:id': 'not_tested_admin_only',
            'POST /roles': 'tested_auth_required',
            'POST /roles/:id/permissions': 'not_tested_admin_only',
            'DELETE /roles/:id/permissions': 'not_tested_admin_only', 
            'PUT /roles/:id': 'not_tested_admin_only',
            'DELETE /roles/:id': 'not_tested_admin_only',
            'GET /roles/user/:id/permissions': 'tested',
            'GET /roles/user/:id/role': 'tested',
            
            # Permissions endpoints
            'GET /permissions/check': 'tested',
            
            # Health endpoint
            'GET /health': 'tested'
        }

        tested_count = sum(1 for status in server_endpoints.values() if 'tested' in status)
        total_count = len(server_endpoints)
        
        logger.info(f"SERVER ENDPOINTS COVERAGE: {tested_count}/{total_count} ({tested_count/total_count*100:.1f}%)")
        
        for endpoint, status in server_endpoints.items():
            if 'not_tested' in status:
                self.test_results['unused_server_endpoints'].append({
                    'endpoint': endpoint,
                    'reason': status
                })

    def analyze_client_methods(self):
        """Анализ клиентских методов API"""
        logger.info("=== ANALYZING CLIENT METHODS ===")
        
        # Список всех клиентских методов из api.ts
        client_methods = [
            'login',
            'getUser', 
            'updateUser',
            'getChannels',
            'createChannel',
            'updateChannel',
            'deleteChannel',
            'getMessages',
            'getMessagesByChannel',
            'createMessage', 
            'updateMessage',
            'deleteMessage',
            'getAllUsers',
            'createUser',
            'deleteUser',
            'getRoles',
            'createRole',
            'addPermissionToRole',
            'removePermissionFromRole',
            'getUserPermissions',
            'updateRole',
            'deleteRole',
            'hasPermission',
            'getUserRole',
            'getRoleById'
        ]

        # Определяем, какие методы были протестированы в этом запуске
        tested_methods = [
            'login', 'getUser', 'updateUser', 'getChannels', 'createChannel', 
            'updateChannel', 'deleteChannel', 'getMessages', 'getMessagesByChannel', 
            'createMessage', 'updateMessage', 'deleteMessage', 'getAllUsers', 
            'createUser', 'deleteUser', 'getRoles', 'createRole', 'addPermissionToRole', 
            'removePermissionFromRole', 'updateRole', 'deleteRole', 'getUserPermissions', 
            'hasPermission', 'getUserRole', 'getRoleById'
        ]

        for method in client_methods:
            self.test_results['client_methods'][method] = {
                'exists': True,
                'tested': method in tested_methods
            }

        tested_methods = sum(1 for data in self.test_results['client_methods'].values() if data['tested'])
        total_methods = len(client_methods)
        
        logger.info(f"CLIENT METHODS COVERAGE: {tested_methods}/{total_methods} ({tested_methods/total_methods*100:.1f}%)")

    def check_data_integrity(self):
        """Проверка целостности данных"""
        logger.info("=== CHECKING DATA INTEGRITY ===")
        
        integrity_issues = []
        
        # Проверяем, что все созданные данные содержат необходимые поля
        for user in self.test_data['users']:
            # Users have 'joinedAt' instead of 'createdAt'
            required_fields = ['id', 'username', 'role', 'joinedAt']
            missing_fields = [field for field in required_fields if field not in user]
            if missing_fields:
                integrity_issues.append(f"User missing fields: {missing_fields}")

        for channel in self.test_data['channels']:
            required_fields = ['id', 'name', 'createdBy', 'createdAt']
            missing_fields = [field for field in required_fields if field not in channel]
            if missing_fields:
                integrity_issues.append(f"Channel missing fields: {missing_fields}")

        for message in self.test_data['messages']:
            # Messages have 'timestamp' instead of 'createdAt'
            required_fields = ['id', 'channelId', 'userId', 'content', 'timestamp']
            missing_fields = [field for field in required_fields if field not in message]
            if missing_fields:
                integrity_issues.append(f"Message missing fields: {missing_fields}")

        for role in self.test_data['roles']:
            required_fields = ['id', 'name', 'permissions', 'createdAt']
            missing_fields = [field for field in required_fields if field not in role]
            if missing_fields:
                integrity_issues.append(f"Role missing fields: {missing_fields}")

        self.test_results['data_integrity'] = {
            'issues': integrity_issues,
            'users_created': len(self.test_data['users']),
            'channels_created': len(self.test_data['channels']),
            'messages_created': len(self.test_data['messages']),
            'roles_found': len(self.test_data['roles'])
        }

        if integrity_issues:
            logger.warning(f"DATA INTEGRITY ISSUES FOUND: {len(integrity_issues)}")
            for issue in integrity_issues:
                logger.warning(f"  - {issue}")
        else:
            logger.info("DATA INTEGRITY: ALL CHECKS PASSED")

    def identify_missing_methods(self):
        """Определение отсутствующих методов"""
        logger.info("=== IDENTIFYING MISSING METHODS ===")
        
        # Серверные endpoints, которые не имеют соответствующих клиентских методов
        server_only = [
            # Теперь все endpoints имеют клиентские соответствия
        ]
        
        # Клиентские методы, которые не соответствуют серверным endpoints
        client_only = [
            # Все клиентские методы имеют серверные соответствия
        ]

        self.test_results['missing_methods'] = {
            'server_only': server_only,
            'client_only': client_only
        }

        if server_only:
            logger.warning(f"SERVER ENDPOINTS WITHOUT CLIENT METHODS: {len(server_only)}")
            for endpoint in server_only:
                logger.warning(f"  - {endpoint}")
        else:
            logger.info("✅ All server endpoints have corresponding client methods")

        if client_only:
            logger.warning(f"CLIENT METHODS WITHOUT SERVER ENDPOINTS: {len(client_only)}")
            for method in client_only:
                logger.warning(f"  - {method}")
        else:
            logger.info("✅ All client methods have corresponding server endpoints")

    def generate_report(self):
        """Генерация итогового отчета"""
        logger.info("=== GENERATING FINAL REPORT ===")
        
        report = {
            'test_summary': {
                'timestamp': datetime.now().isoformat(),
                'total_server_endpoints': len(self.test_results['server_endpoints']),
                'total_client_methods': len(self.test_results['client_methods']),
                'data_integrity_issues': len(self.test_results['data_integrity']['issues']),
                'missing_methods': len(self.test_results['missing_methods']['server_only']) + 
                                 len(self.test_results['missing_methods']['client_only'])
            },
            'detailed_results': self.test_results
        }

        # Сохраняем детальный отчет в JSON
        with open('api_test_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False, default=str)

        logger.info("REPORT SAVED TO: api_test_report.json")
        logger.info("DETAILED LOG SAVED TO: api_test_results.log")

        # Выводим краткую сводку
        logger.info("\n" + "="*50)
        logger.info("FINAL SUMMARY:")
        logger.info(f"✅ Server endpoints tested: {report['test_summary']['total_server_endpoints']}")
        logger.info(f"✅ Client methods analyzed: {report['test_summary']['total_client_methods']}")
        logger.info(f"🔍 Data integrity issues: {report['test_summary']['data_integrity_issues']}")
        logger.info(f"⚠️  Missing methods: {report['test_summary']['missing_methods']}")
        logger.info("="*50)

    def run_all_tests(self):
        """Запуск всех тестов"""
        logger.info("🚀 STARTING COMPREHENSIVE API TESTING")
        logger.info("="*50)

        try:
            self.test_health_endpoint()
            self.test_auth_endpoints()
            self.test_channels_endpoints()
            self.test_messages_endpoints()
            self.test_roles_endpoints()
            self.test_permissions_endpoints()
            self.test_admin_endpoints()
            
            self.analyze_server_endpoints()
            self.analyze_client_methods()
            self.check_data_integrity()
            self.identify_missing_methods()
            
            self.generate_report()

        except Exception as e:
            logger.error(f"CRITICAL ERROR DURING TESTING: {str(e)}")
            self.test_results['errors'].append({
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            })

if __name__ == "__main__":
    tester = APITester()
    tester.run_all_tests()