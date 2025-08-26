import requests
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext, simpledialog
import json

BASE_URL = 'http://localhost:3010/api'

class APIClientApp:
    def __init__(self, root):
        self.root = root
        self.root.title("API Tester - Улучшенная версия")
        self.root.geometry("800x700")
        
        self.user_id = None
        self.target_id = None
        self.cached_channels = []
        self.cached_users = []
        self.cached_roles = []
        
        # Top frame for user info
        top_frame = ttk.Frame(root)
        top_frame.pack(fill='x', padx=5, pady=5)
        
        # Login frame
        login_frame = ttk.LabelFrame(top_frame, text="Авторизация и настройки")
        login_frame.pack(fill='x', pady=5)
        
        # Current user info
        info_frame = ttk.Frame(login_frame)
        info_frame.pack(fill='x')
        
        ttk.Label(info_frame, text="Текущий пользователь:").grid(row=0, column=0, sticky='w')
        self.current_user_label = ttk.Label(info_frame, text="Не авторизован", foreground="red")
        self.current_user_label.grid(row=0, column=1, sticky='w', padx=10)
        
        ttk.Label(info_frame, text="Цель для операций:").grid(row=1, column=0, sticky='w')
        self.target_user_label = ttk.Label(info_frame, text="Не выбран", foreground="red")
        self.target_user_label.grid(row=1, column=1, sticky='w', padx=10)
        
        # Login controls
        control_frame = ttk.Frame(login_frame)
        control_frame.pack(fill='x', pady=5)
        
        ttk.Label(control_frame, text="Логин пользователя:").grid(row=0, column=0, padx=5)
        self.from_entry = ttk.Entry(control_frame, width=20)
        self.from_entry.grid(row=0, column=1, padx=5)
        self.from_entry.bind('<Return>', lambda e: self.login_user())
        
        ttk.Button(control_frame, text="Войти", command=self.login_user).grid(row=0, column=2, padx=5)
        ttk.Button(control_frame, text="Выйти", command=self.logout_user).grid(row=0, column=3, padx=5)
        
        # Target selection
        ttk.Label(control_frame, text="Цель (ID/логин):").grid(row=1, column=0, padx=5)
        self.target_entry = ttk.Entry(control_frame, width=20)
        self.target_entry.grid(row=1, column=1, padx=5)
        self.target_entry.bind('<Return>', lambda e: self.set_target())
        
        ttk.Button(control_frame, text="Установить цель", command=self.set_target).grid(row=1, column=2, padx=5)
        ttk.Button(control_frame, text="Выбрать из списка", command=self.select_target_from_list).grid(row=1, column=3, padx=5)
        
        # Tabs
        self.notebook = ttk.Notebook(root)
        self.notebook.pack(expand=True, fill='both', padx=5, pady=5)
        
        self.create_auth_tab()
        self.create_channels_tab()
        self.create_messages_tab()
        self.create_roles_tab()
        self.create_permissions_tab()

    def login_user(self):
        username = self.from_entry.get().strip()
        if not username:
            messagebox.showwarning("Предупреждение", "Введите имя пользователя")
            return
            
        response = requests.post(f'{BASE_URL}/auth/login', json={'username': username})
        if response.status_code == 200:
            user_data = response.json()['user']
            self.user_id = user_data['id']
            self.current_user_label.config(text=f"{user_data['username']} ({user_data['role']})", foreground="green")
            messagebox.showinfo("Успех", f"Вход выполнен как {user_data['username']}")
            self.refresh_cached_data()
        else:
            error_msg = response.json().get('error', 'Неизвестная ошибка')
            messagebox.showerror("Ошибка", f"Ошибка входа: {error_msg}")

    def logout_user(self):
        self.user_id = None
        self.target_id = None
        self.current_user_label.config(text="Не авторизован", foreground="red")
        self.target_user_label.config(text="Не выбран", foreground="red")
        self.from_entry.delete(0, tk.END)
        self.target_entry.delete(0, tk.END)
        self.cached_channels = []
        self.cached_users = []
        messagebox.showinfo("Успех", "Выход выполнен")

    def set_target(self):
        target = self.target_entry.get().strip()
        if not target:
            self.target_id = None
            self.target_user_label.config(text="Не выбран", foreground="red")
            return
            
        # Try to find user by username first
        if self.cached_users:
            for user in self.cached_users:
                if user['username'] == target:
                    self.target_id = user['id']
                    self.target_user_label.config(text=f"{user['username']} ({user['role']})", foreground="blue")
                    return
        
        # If not found, assume it's an ID
        self.target_id = target
        self.target_user_label.config(text=f"ID: {target}", foreground="blue")

    def select_target_from_list(self):
        if not self.cached_users:
            messagebox.showwarning("Предупреждение", "Сначала получите список пользователей")
            return
            
        # Create selection window
        selection_window = tk.Toplevel(self.root)
        selection_window.title("Выбор пользователя")
        selection_window.geometry("400x300")
        
        listbox = tk.Listbox(selection_window)
        listbox.pack(fill='both', expand=True, padx=10, pady=10)
        
        for user in self.cached_users:
            listbox.insert(tk.END, f"{user['username']} ({user['role']}) - {user['id']}")
        
        def on_select():
            selection = listbox.curselection()
            if selection:
                user = self.cached_users[selection[0]]
                self.target_id = user['id']
                self.target_entry.delete(0, tk.END)
                self.target_entry.insert(0, user['username'])
                self.target_user_label.config(text=f"{user['username']} ({user['role']})", foreground="blue")
                selection_window.destroy()
        
        ttk.Button(selection_window, text="Выбрать", command=on_select).pack(pady=5)

    def refresh_cached_data(self):
        if not self.user_id:
            return
            
        # Cache users
        try:
            resp = self.make_request('GET', 'auth/users')
            if resp.status_code == 200:
                self.cached_users = resp.json()['users']
        except:
            pass
            
        # Cache channels
        try:
            resp = self.make_request('GET', 'channels/')
            if resp.status_code == 200:
                self.cached_channels = resp.json()['channels']
        except:
            pass
            
        # Cache roles
        try:
            resp = self.make_request('GET', 'roles/')
            if resp.status_code == 200:
                self.cached_roles = resp.json()['roles']
        except:
            pass

    def create_auth_tab(self):
        tab = ttk.Frame(self.notebook)
        self.notebook.add(tab, text="Пользователи")
        self.add_tab_content(tab, [
            ("Получить всех пользователей", self.test_get_all_users),
            ("Профиль цели", lambda out: self.test_get_user_profile(out) if self.target_id else messagebox.showwarning("Предупреждение", "Выберите цель")),
            ("Создать пользователя", self.test_create_user),
            ("Обновить профиль цели", lambda out: self.test_update_user_profile(out) if self.target_id else messagebox.showwarning("Предупреждение", "Выберите цель")),
            ("Изменить роль цели", lambda out: self.test_update_user_role(out) if self.target_id else messagebox.showwarning("Предупреждение", "Выберите цель")),
            ("Удалить цель", lambda out: self.test_delete_user(out) if self.target_id else messagebox.showwarning("Предупреждение", "Выберите цель"))
        ])

    def create_channels_tab(self):
        tab = ttk.Frame(self.notebook)
        self.notebook.add(tab, text="Каналы")
        self.add_tab_content(tab, [
            ("Получить все каналы", self.test_get_all_channels),
            ("Создать канал", self.test_create_channel),
            ("Обновить канал", self.test_update_channel),
            ("Удалить канал", self.test_delete_channel)
        ])

    def create_messages_tab(self):
        tab = ttk.Frame(self.notebook)
        self.notebook.add(tab, text="Сообщения")
        self.add_tab_content(tab, [
            ("Сообщения канала", self.test_get_messages_by_channel),
            ("Все сообщения", self.test_get_all_messages),
            ("Создать сообщение", self.test_create_message),
            ("Обновить сообщение", self.test_update_message),
            ("Удалить сообщение", self.test_delete_message)
        ])

    def create_roles_tab(self):
        tab = ttk.Frame(self.notebook)
        self.notebook.add(tab, text="Роли")
        self.add_tab_content(tab, [
            ("Получить все роли", self.test_get_all_roles),
            ("Роль по ID", self.test_get_role_by_id),
            ("Создать роль", self.test_create_role),
            ("Обновить роль", self.test_update_role),
            ("Удалить роль", self.test_delete_role),
            ("Права цели", lambda out: self.test_get_user_permissions(out) if self.target_id else messagebox.showwarning("Предупреждение", "Выберите цель")),
            ("Роль цели", lambda out: self.test_get_user_role(out) if self.target_id else messagebox.showwarning("Предупреждение", "Выберите цель"))
        ])

    def create_permissions_tab(self):
        tab = ttk.Frame(self.notebook)
        self.notebook.add(tab, text="Разрешения")
        self.add_tab_content(tab, [
            ("Все разрешения", self.test_get_all_permissions),
            ("Создать разрешение", self.test_create_permission),
            ("Обновить разрешение", self.test_update_permission),
            ("Удалить разрешение", self.test_delete_permission),
            ("Проверить право", self.test_check_permission)
        ])

    def add_tab_content(self, tab, buttons):
        frame = ttk.Frame(tab)
        frame.pack(fill='x', padx=5, pady=5)
        output = scrolledtext.ScrolledText(tab, height=20, font=('Consolas', 9))
        output.pack(fill='both', expand=True, padx=5, pady=5)
        
        # Разбиваем кнопки по строкам
        for i, (label, func) in enumerate(buttons):
            row = i // 3
            col = i % 3
            ttk.Button(frame, text=label, command=lambda f=func: f(lambda text: self.print_to_output(output, text))).grid(
                row=row, column=col, padx=2, pady=2, sticky='ew'
            )
        
        # Настраиваем растягивание колонок
        for i in range(3):
            frame.grid_columnconfigure(i, weight=1)

    def print_to_output(self, output_widget, text):
        output_widget.insert(tk.END, text + '\n')
        output_widget.see(tk.END)

    def make_request(self, method, endpoint, data=None, params=None):
        headers = {'x-user-id': self.user_id} if self.user_id else {}
        url = f'{BASE_URL}/{endpoint}'
        try:
            if method == 'GET':
                return requests.get(url, headers=headers, json=data, params=params)
            elif method == 'POST':
                return requests.post(url, headers=headers, json=data)
            elif method == 'PUT':
                return requests.put(url, headers=headers, json=data)
            elif method == 'DELETE':
                return requests.delete(url, headers=headers)
        except requests.RequestException as e:
            return type('Response', (), {'status_code': 0, 'json': lambda: {'error': str(e)}})()

    # Диалоговые окна для более удобного ввода данных
    class MultiFieldDialog:
        def __init__(self, parent, title, fields):
            self.result = None
            self.dialog = tk.Toplevel(parent)
            self.dialog.title(title)
            self.dialog.geometry("400x300")
            self.dialog.transient(parent)
            self.dialog.grab_set()
            
            self.fields = {}
            
            # Создаем поля ввода
            for i, (field_name, field_type, default_value) in enumerate(fields):
                ttk.Label(self.dialog, text=field_name + ":").grid(row=i, column=0, sticky='w', padx=5, pady=2)
                
                if field_type == 'entry':
                    widget = ttk.Entry(self.dialog, width=30)
                    widget.insert(0, default_value or '')
                elif field_type == 'text':
                    widget = tk.Text(self.dialog, height=3, width=30)
                    if default_value:
                        widget.insert('1.0', default_value)
                elif field_type == 'checkbox':
                    var = tk.BooleanVar()
                    var.set(default_value or False)
                    widget = ttk.Checkbutton(self.dialog, variable=var)
                    widget.var = var
                elif field_type == 'combobox':
                    widget = ttk.Combobox(self.dialog, values=default_value or [], width=27)
                    
                widget.grid(row=i, column=1, sticky='ew', padx=5, pady=2)
                self.fields[field_name] = (widget, field_type)
            
            # Кнопки
            button_frame = ttk.Frame(self.dialog)
            button_frame.grid(row=len(fields), column=0, columnspan=2, pady=10)
            
            ttk.Button(button_frame, text="OK", command=self.ok_clicked).pack(side='left', padx=5)
            ttk.Button(button_frame, text="Отмена", command=self.dialog.destroy).pack(side='left', padx=5)
            
            self.dialog.grid_columnconfigure(1, weight=1)
            
        def ok_clicked(self):
            self.result = {}
            for field_name, (widget, field_type) in self.fields.items():
                if field_type == 'entry':
                    value = widget.get().strip()
                elif field_type == 'text':
                    value = widget.get('1.0', 'end-1c').strip()
                elif field_type == 'checkbox':
                    value = widget.var.get()
                elif field_type == 'combobox':
                    value = widget.get().strip()
                
                self.result[field_name] = value if value != '' else None
            self.dialog.destroy()
        
        def show(self):
            self.dialog.wait_window()
            return self.result

    # Улучшенные методы тестирования
    def test_get_all_users(self, print_func):
        print_func("=== Получение всех пользователей ===")
        resp = self.make_request('GET', 'auth/users')
        if resp.status_code == 200:
            self.cached_users = resp.json()['users']
        print_func(f"Статус: {resp.status_code}")
        print_func(json.dumps(resp.json(), indent=2, ensure_ascii=False))

    def test_get_user_profile(self, print_func):
        print_func("=== Получение профиля пользователя ===")
        resp = self.make_request('GET', f'auth/user/{self.target_id}')
        print_func(f"Статус: {resp.status_code}")
        print_func(json.dumps(resp.json(), indent=2, ensure_ascii=False))

    def test_create_user(self, print_func):
        dialog = self.MultiFieldDialog(self.root, "Создание пользователя", [
            ("Имя пользователя", 'entry', ''),
            ("Роль", 'combobox', [r['name'] for r in self.cached_roles] if self.cached_roles else ['user', 'admin']),
            ("Биография", 'text', '')
        ])
        
        data = dialog.show()
        if data and data['Имя пользователя']:
            request_data = {'username': data['Имя пользователя']}
            if data['Роль']:
                request_data['role'] = data['Роль']
            if data['Биография']:
                request_data['bio'] = data['Биография']
                
            print_func("=== Создание пользователя ===")
            resp = self.make_request('POST', 'auth/users', request_data)
            print_func(f"Статус: {resp.status_code}")
            print_func(json.dumps(resp.json(), indent=2, ensure_ascii=False))
            
            if resp.status_code == 200:
                self.refresh_cached_data()

    def test_update_user_profile(self, print_func):
        # Получаем текущие данные пользователя
        current_data = {}
        try:
            resp = self.make_request('GET', f'auth/user/{self.target_id}')
            if resp.status_code == 200:
                current_data = resp.json()['user']
        except:
            pass
        
        dialog = self.MultiFieldDialog(self.root, "Обновление профиля", [
            ("Биография", 'text', current_data.get('bio', '')),
            ("Аватар", 'entry', current_data.get('avatar', ''))
        ])
        
        data = dialog.show()
        if data:
            request_data = {}
            if data['Биография'] is not None:
                request_data['bio'] = data['Биография']
            if data['Аватар'] is not None:
                request_data['avatar'] = data['Аватар']
                
            if request_data:
                print_func("=== Обновление профиля ===")
                resp = self.make_request('PUT', f'auth/user/{self.target_id}', request_data)
                print_func(f"Статус: {resp.status_code}")
                print_func(json.dumps(resp.json(), indent=2, ensure_ascii=False))

    def test_update_user_role(self, print_func):
        role_names = [r['name'] for r in self.cached_roles] if self.cached_roles else ['user', 'admin', 'blocked']
        
        dialog = self.MultiFieldDialog(self.root, "Изменение роли", [
            ("Новая роль", 'combobox', role_names)
        ])
        
        data = dialog.show()
        if data and data['Новая роль']:
            print_func("=== Изменение роли пользователя ===")
            resp = self.make_request('PUT', f'auth/user/{self.target_id}/role', {'role': data['Новая роль']})
            print_func(f"Статус: {resp.status_code}")
            print_func(json.dumps(resp.json(), indent=2, ensure_ascii=False))

    def test_delete_user(self, print_func):
        if messagebox.askyesno("Подтверждение", "Удалить пользователя?"):
            print_func("=== Удаление пользователя ===")
            resp = self.make_request('DELETE', f'auth/user/{self.target_id}')
            print_func(f"Статус: {resp.status_code}")
            print_func(json.dumps(resp.json(), indent=2, ensure_ascii=False))
            
            if resp.status_code == 200:
                self.refresh_cached_data()

    def test_get_all_channels(self, print_func):
        print_func("=== Получение всех каналов ===")
        resp = self.make_request('GET', 'channels/')
        if resp.status_code == 200:
            self.cached_channels = resp.json()['channels']
        print_func(f"Статус: {resp.status_code}")
        print_func(json.dumps(resp.json(), indent=2, ensure_ascii=False))

    def test_create_channel(self, print_func):
        dialog = self.MultiFieldDialog(self.root, "Создание канала", [
            ("Название", 'entry', ''),
            ("Описание", 'text', ''),
            ("Закрепить", 'checkbox', False),
            ("Только для чтения", 'checkbox', False)
        ])
        
        data = dialog.show()
        if data and data['Название']:
            request_data = {'name': data['Название']}
            if data['Описание']:
                request_data['description'] = data['Описание']
            if data['Закрепить']:
                request_data['isPinned'] = True
            if data['Только для чтения']:
                request_data['isReadOnly'] = True
                
            print_func("=== Создание канала ===")
            resp = self.make_request('POST', 'channels/', request_data)
            print_func(f"Статус: {resp.status_code}")
            print_func(json.dumps(resp.json(), indent=2, ensure_ascii=False))
            
            if resp.status_code == 200:
                self.refresh_cached_data()

    def test_update_channel(self, print_func):
        # Выбор канала
        if not self.cached_channels:
            messagebox.showwarning("Предупреждение", "Сначала получите список каналов")
            return
            
        # Создаем окно выбора канала
        selection_window = tk.Toplevel(self.root)
        selection_window.title("Выбор канала")
        selection_window.geometry("500x200")
        
        listbox = tk.Listbox(selection_window)
        listbox.pack(fill='both', expand=True, padx=10, pady=10)
        
        for channel in self.cached_channels:
            listbox.insert(tk.END, f"{channel['name']} - {channel['id']}")
        
        selected_channel = [None]
        
        def on_select():
            selection = listbox.curselection()
            if selection:
                selected_channel[0] = self.cached_channels[selection[0]]
                selection_window.destroy()
        
        ttk.Button(selection_window, text="Выбрать", command=on_select).pack(pady=5)
        selection_window.wait_window()
        
        if not selected_channel[0]:
            return
            
        channel = selected_channel[0]
        
        # Диалог для обновления
        dialog = self.MultiFieldDialog(self.root, f"Обновление канала: {channel['name']}", [
            ("Название", 'entry', channel.get('name', '')),
            ("Описание", 'text', channel.get('description', '')),
            ("Закрепить", 'checkbox', channel.get('isPinned', False)),
            ("Только для чтения", 'checkbox', channel.get('isReadOnly', False))
        ])
        
        data = dialog.show()
        if data:
            request_data = {}
            if data['Название']:
                request_data['name'] = data['Название']
            if data['Описание'] is not None:
                request_data['description'] = data['Описание']
            request_data['isPinned'] = data['Закрепить']
            request_data['isReadOnly'] = data['Только для чтения']
                
            print_func(f"=== Обновление канала {channel['name']} ===")
            resp = self.make_request('PUT', f'channels/{channel["id"]}', request_data)
            print_func(f"Статус: {resp.status_code}")
            print_func(json.dumps(resp.json(), indent=2, ensure_ascii=False))

    def test_delete_channel(self, print_func):
        if not self.cached_channels:
            messagebox.showwarning("Предупреждение", "Сначала получите список каналов")
            return
            
        # Создаем окно выбора канала
        selection_window = tk.Toplevel(self.root)
        selection_window.title("Удаление канала")
        selection_window.geometry("500x200")
        
        listbox = tk.Listbox(selection_window)
        listbox.pack(fill='both', expand=True, padx=10, pady=10)
        
        for channel in self.cached_channels:
            listbox.insert(tk.END, f"{channel['name']} - {channel['id']}")
        
        selected_channel = [None]
        
        def on_select():
            selection = listbox.curselection()
            if selection:
                selected_channel[0] = self.cached_channels[selection[0]]
                selection_window.destroy()
        
        ttk.Button(selection_window, text="Удалить", command=on_select).pack(pady=5)
        selection_window.wait_window()
        
        if selected_channel[0] and messagebox.askyesno("Подтверждение", f"Удалить канал '{selected_channel[0]['name']}'?"):
            channel = selected_channel[0]
            print_func(f"=== Удаление канала {channel['name']} ===")
            resp = self.make_request('DELETE', f'channels/{channel["id"]}')
            print_func(f"Статус: {resp.status_code}")
            print_func(json.dumps(resp.json(), indent=2, ensure_ascii=False))
            
            if resp.status_code == 200:
                self.refresh_cached_data()

    def test_get_messages_by_channel(self, print_func):
        if not self.cached_channels:
            channel_id = tk.simpledialog.askstring("Ввод", "Введите ID канала:")
        else:
            # Создаем окно выбора канала
            selection_window = tk.Toplevel(self.root)
            selection_window.title("Выбор канала для сообщений")
            selection_window.geometry("500x200")
            
            listbox = tk.Listbox(selection_window)
            listbox.pack(fill='both', expand=True, padx=10, pady=10)
            
            for channel in self.cached_channels:
                listbox.insert(tk.END, f"{channel['name']} - {channel['id']}")
            
            selected_channel = [None]
            
            def on_select():
                selection = listbox.curselection()
                if selection:
                    selected_channel[0] = self.cached_channels[selection[0]]['id']
                    selection_window.destroy()
            
            ttk.Button(selection_window, text="Выбрать", command=on_select).pack(pady=5)
            selection_window.wait_window()
            
            channel_id = selected_channel[0]
        
        if channel_id:
            print_func("=== Получение сообщений канала ===")
            resp = self.make_request('GET', f'messages/channel/{channel_id}')
            print_func(f"Статус: {resp.status_code}")
            print_func(json.dumps(resp.json(), indent=2, ensure_ascii=False))

    def test_get_all_messages(self, print_func):
        print_func("=== Получение всех сообщений ===")
        resp = self.make_request('GET', 'messages/')
        print_func(f"Статус: {resp.status_code}")
        print_func(json.dumps(resp.json(), indent=2, ensure_ascii=False))

    def test_create_message(self, print_func):
        if not self.cached_channels:
            messagebox.showwarning("Предупреждение", "Сначала получите список каналов")
            return
            
        channel_names = [f"{ch['name']} ({ch['id']})" for ch in self.cached_channels]
        
        dialog = self.MultiFieldDialog(self.root, "Создание сообщения", [
            ("Канал", 'combobox', channel_names),
            ("Содержание", 'text', '')
        ])
        
        data = dialog.show()
        if data and data['Канал'] and data['Содержание']:
            # Извлекаем ID канала из строки
            channel_id = data['Канал'].split('(')[1].split(')')[0]
            
            request_data = {
                'channelId': channel_id,
                'content': data['Содержание']
            }
                
            print_func("=== Создание сообщения ===")
            resp = self.make_request('POST', 'messages/', request_data)
            print_func(f"Статус: {resp.status_code}")
            print_func(json.dumps(resp.json(), indent=2, ensure_ascii=False))

    def test_update_message(self, print_func):
        message_id = tk.simpledialog.askstring("Ввод", "Введите ID сообщения:")
        if not message_id:
            return
            
        dialog = self.MultiFieldDialog(self.root, "Обновление сообщения", [
            ("Новое содержание", 'text', ''),
            ("Закрепить", 'checkbox', False)
        ])
        
        data = dialog.show()
        if data:
            request_data = {}
            if data['Новое содержание']:
                request_data['content'] = data['Новое содержание']
            if data['Закрепить']:
                request_data['isPinned'] = True
                
            if request_data:
                print_func("=== Обновление сообщения ===")
                resp = self.make_request('PUT', f'messages/{message_id}', request_data)
                print_func(f"Статус: {resp.status_code}")
                print_func(json.dumps(resp.json(), indent=2, ensure_ascii=False))

    def test_delete_message(self, print_func):
        message_id = tk.simpledialog.askstring("Ввод", "Введите ID сообщения:")
        if message_id and messagebox.askyesno("Подтверждение", "Удалить сообщение?"):
            print_func("=== Удаление сообщения ===")
            resp = self.make_request('DELETE', f'messages/{message_id}')
            print_func(f"Статус: {resp.status_code}")
            print_func(json.dumps(resp.json(), indent=2, ensure_ascii=False))

    def test_get_all_roles(self, print_func):
        print_func("=== Получение всех ролей ===")
        resp = self.make_request('GET', 'roles/')
        if resp.status_code == 200:
            self.cached_roles = resp.json()['roles']
        print_func(f"Статус: {resp.status_code}")
        print_func(json.dumps(resp.json(), indent=2, ensure_ascii=False))

    def test_get_role_by_id(self, print_func):
        if not self.cached_roles:
            role_id = tk.simpledialog.askstring("Ввод", "Введите ID роли:")
        else:
            # Создаем окно выбора роли
            selection_window = tk.Toplevel(self.root)
            selection_window.title("Выбор роли")
            selection_window.geometry("400x200")
            
            listbox = tk.Listbox(selection_window)
            listbox.pack(fill='both', expand=True, padx=10, pady=10)
            
            for role in self.cached_roles:
                listbox.insert(tk.END, f"{role['name']} - {role['id']}")
            
            selected_role = [None]
            
            def on_select():
                selection = listbox.curselection()
                if selection:
                    selected_role[0] = self.cached_roles[selection[0]]['id']
                    selection_window.destroy()
            
            ttk.Button(selection_window, text="Выбрать", command=on_select).pack(pady=5)
            selection_window.wait_window()
            
            role_id = selected_role[0]
        
        if role_id:
            print_func("=== Получение роли по ID ===")
            resp = self.make_request('GET', f'roles/{role_id}')
            print_func(f"Статус: {resp.status_code}")
            print_func(json.dumps(resp.json(), indent=2, ensure_ascii=False))

    def test_create_role(self, print_func):
        # Получаем список разрешений
        permissions = []
        try:
            resp = self.make_request('GET', 'permissions/')
            if resp.status_code == 200:
                permissions = resp.json()['permissions']
        except:
            pass
        
        dialog = self.MultiFieldDialog(self.root, "Создание роли", [
            ("Название", 'entry', ''),
            ("Описание", 'text', '')
        ])
        
        data = dialog.show()
        if data and data['Название']:
            request_data = {'name': data['Название']}
            if data['Описание']:
                request_data['description'] = data['Описание']
                
            print_func("=== Создание роли ===")
            resp = self.make_request('POST', 'roles/', request_data)
            print_func(f"Статус: {resp.status_code}")
            print_func(json.dumps(resp.json(), indent=2, ensure_ascii=False))
            
            if resp.status_code == 200:
                self.refresh_cached_data()

    def test_update_role(self, print_func):
        if not self.cached_roles:
            messagebox.showwarning("Предупреждение", "Сначала получите список ролей")
            return
            
        # Создаем окно выбора роли
        selection_window = tk.Toplevel(self.root)
        selection_window.title("Выбор роли для обновления")
        selection_window.geometry("400x200")
        
        listbox = tk.Listbox(selection_window)
        listbox.pack(fill='both', expand=True, padx=10, pady=10)
        
        for role in self.cached_roles:
            listbox.insert(tk.END, f"{role['name']} - {role['id']}")
        
        selected_role = [None]
        
        def on_select():
            selection = listbox.curselection()
            if selection:
                selected_role[0] = self.cached_roles[selection[0]]
                selection_window.destroy()
        
        ttk.Button(selection_window, text="Выбрать", command=on_select).pack(pady=5)
        selection_window.wait_window()
        
        if not selected_role[0]:
            return
            
        role = selected_role[0]
        
        # Получаем список разрешений для выбора
        permissions = []
        try:
            resp = self.make_request('GET', 'permissions/')
            if resp.status_code == 200:
                permissions = resp.json()['permissions']
        except:
            pass
        
        # Создаем окно для редактирования роли с разрешениями
        edit_window = tk.Toplevel(self.root)
        edit_window.title(f"Редактирование роли: {role['name']}")
        edit_window.geometry("600x400")
        
        # Название и описание
        ttk.Label(edit_window, text="Название:").grid(row=0, column=0, sticky='w', padx=5, pady=2)
        name_entry = ttk.Entry(edit_window, width=40)
        name_entry.insert(0, role.get('name', ''))
        name_entry.grid(row=0, column=1, sticky='ew', padx=5, pady=2)
        
        ttk.Label(edit_window, text="Описание:").grid(row=1, column=0, sticky='nw', padx=5, pady=2)
        desc_text = tk.Text(edit_window, height=3, width=40)
        desc_text.insert('1.0', role.get('description', ''))
        desc_text.grid(row=1, column=1, sticky='ew', padx=5, pady=2)
        
        # Разрешения
        ttk.Label(edit_window, text="Разрешения:").grid(row=2, column=0, sticky='nw', padx=5, pady=2)
        
        perm_frame = ttk.Frame(edit_window)
        perm_frame.grid(row=2, column=1, sticky='nsew', padx=5, pady=2)
        
        canvas = tk.Canvas(perm_frame)
        scrollbar = ttk.Scrollbar(perm_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # Чекбоксы для разрешений
        perm_vars = {}
        current_permissions = set(role.get('permissions', []))
        
        for perm in permissions:
            var = tk.BooleanVar()
            var.set(perm['id'] in current_permissions)
            perm_vars[perm['id']] = var
            
            cb = ttk.Checkbutton(
                scrollable_frame, 
                text=f"{perm['name']} - {perm['description']}", 
                variable=var
            )
            cb.pack(anchor='w', pady=1)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        # Кнопки
        button_frame = ttk.Frame(edit_window)
        button_frame.grid(row=3, column=0, columnspan=2, pady=10)
        
        result = [None]
        
        def save_changes():
            selected_perms = [perm_id for perm_id, var in perm_vars.items() if var.get()]
            result[0] = {
                'name': name_entry.get().strip(),
                'description': desc_text.get('1.0', 'end-1c').strip(),
                'permissions': selected_perms
            }
            edit_window.destroy()
        
        ttk.Button(button_frame, text="Сохранить", command=save_changes).pack(side='left', padx=5)
        ttk.Button(button_frame, text="Отмена", command=edit_window.destroy).pack(side='left', padx=5)
        
        edit_window.grid_columnconfigure(1, weight=1)
        edit_window.grid_rowconfigure(2, weight=1)
        
        edit_window.wait_window()
        
        if result[0]:
            request_data = result[0]
            print_func(f"=== Обновление роли {role['name']} ===")
            resp = self.make_request('PUT', f'roles/{role["id"]}', request_data)
            print_func(f"Статус: {resp.status_code}")
            print_func(json.dumps(resp.json(), indent=2, ensure_ascii=False))

    def test_delete_role(self, print_func):
        if not self.cached_roles:
            messagebox.showwarning("Предупреждение", "Сначала получите список ролей")
            return
            
        # Создаем окно выбора роли
        selection_window = tk.Toplevel(self.root)
        selection_window.title("Удаление роли")
        selection_window.geometry("400x200")
        
        listbox = tk.Listbox(selection_window)
        listbox.pack(fill='both', expand=True, padx=10, pady=10)
        
        for role in self.cached_roles:
            listbox.insert(tk.END, f"{role['name']} - {role['id']}")
        
        selected_role = [None]
        
        def on_select():
            selection = listbox.curselection()
            if selection:
                selected_role[0] = self.cached_roles[selection[0]]
                selection_window.destroy()
        
        ttk.Button(selection_window, text="Удалить", command=on_select).pack(pady=5)
        selection_window.wait_window()
        
        if selected_role[0] and messagebox.askyesno("Подтверждение", f"Удалить роль '{selected_role[0]['name']}'?"):
            role = selected_role[0]
            print_func(f"=== Удаление роли {role['name']} ===")
            resp = self.make_request('DELETE', f'roles/{role["id"]}')
            print_func(f"Статус: {resp.status_code}")
            print_func(json.dumps(resp.json(), indent=2, ensure_ascii=False))
            
            if resp.status_code == 200:
                self.refresh_cached_data()

    def test_get_user_permissions(self, print_func):
        print_func("=== Получение разрешений пользователя ===")
        resp = self.make_request('GET', f'roles/user/{self.target_id}/permissions')
        print_func(f"Статус: {resp.status_code}")
        print_func(json.dumps(resp.json(), indent=2, ensure_ascii=False))

    def test_get_user_role(self, print_func):
        print_func("=== Получение роли пользователя ===")
        resp = self.make_request('GET', f'roles/user/{self.target_id}/role')
        print_func(f"Статус: {resp.status_code}")
        print_func(json.dumps(resp.json(), indent=2, ensure_ascii=False))

    def test_get_all_permissions(self, print_func):
        print_func("=== Получение всех разрешений ===")
        resp = self.make_request('GET', 'permissions/')
        print_func(f"Статус: {resp.status_code}")
        print_func(json.dumps(resp.json(), indent=2, ensure_ascii=False))

    def test_create_permission(self, print_func):
        categories = ['system', 'messages', 'channels', 'users', 'roles', 'admin']
        
        dialog = self.MultiFieldDialog(self.root, "Создание разрешения", [
            ("Название", 'entry', ''),
            ("Описание", 'text', ''),
            ("Категория", 'combobox', categories),
            ("Базовое разрешение", 'checkbox', False)
        ])
        
        data = dialog.show()
        if data and data['Название'] and data['Описание'] and data['Категория']:
            request_data = {
                'name': data['Название'],
                'description': data['Описание'],
                'category': data['Категория'],
                'isBasic': data['Базовое разрешение']
            }
                
            print_func("=== Создание разрешения ===")
            resp = self.make_request('POST', 'permissions/', request_data)
            print_func(f"Статус: {resp.status_code}")
            print_func(json.dumps(resp.json(), indent=2, ensure_ascii=False))

    def test_update_permission(self, print_func):
        perm_id = tk.simpledialog.askstring("Ввод", "Введите ID разрешения:")
        if not perm_id:
            return
            
        categories = ['system', 'messages', 'channels', 'users', 'roles', 'admin']
        
        dialog = self.MultiFieldDialog(self.root, "Обновление разрешения", [
            ("Название", 'entry', ''),
            ("Описание", 'text', ''),
            ("Категория", 'combobox', categories),
            ("Базовое разрешение", 'checkbox', False)
        ])
        
        data = dialog.show()
        if data:
            request_data = {}
            if data['Название']:
                request_data['name'] = data['Название']
            if data['Описание']:
                request_data['description'] = data['Описание']
            if data['Категория']:
                request_data['category'] = data['Категория']
            request_data['isBasic'] = data['Базовое разрешение']
                
            if request_data:
                print_func("=== Обновление разрешения ===")
                resp = self.make_request('PUT', f'permissions/{perm_id}', request_data)
                print_func(f"Статус: {resp.status_code}")
                print_func(json.dumps(resp.json(), indent=2, ensure_ascii=False))

    def test_delete_permission(self, print_func):
        perm_id = tk.simpledialog.askstring("Ввод", "Введите ID разрешения:")
        if perm_id and messagebox.askyesno("Подтверждение", "Удалить разрешение?"):
            print_func("=== Удаление разрешения ===")
            resp = self.make_request('DELETE', f'permissions/{perm_id}')
            print_func(f"Статус: {resp.status_code}")
            print_func(json.dumps(resp.json(), indent=2, ensure_ascii=False))

    def test_check_permission(self, print_func):
        permission = tk.simpledialog.askstring("Ввод", "Введите название разрешения для проверки:")
        if permission:
            print_func("=== Проверка разрешения ===")
            resp = self.make_request('GET', 'permissions/check', params={'permission': permission})
            print_func(f"Статус: {resp.status_code}")
            print_func(json.dumps(resp.json(), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    root = tk.Tk()
    app = APIClientApp(root)
    root.mainloop()