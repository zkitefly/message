import os
import requests
import time as t
import json
import win32com.client
from pathlib import Path
import tempfile
import locale

# 设置日志文件路径
log_file = os.path.join(Path.home(), "Documents", "message_log.txt")

# 设置本地保存的时间文件
time_file = os.path.join(Path.home(), "Documents", "last_time.txt")

# 设置 chat.txt 文件路径 (你可以自定义位置)
chat_file = os.path.join(Path.home(), "Documents", "chat.txt")

# 设置日志记录函数
def log_message(message):
    with open(log_file, 'a') as log:
        log.write(f"{t.strftime('%Y-%m-%d %H:%M:%S')} - {message}\n")

# 设置开机自启函数
def set_autorun():
    startup_path = os.path.join(os.getenv('APPDATA'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')
    script_path = os.path.join(Path.home(), "Documents", "chat.exe")
    shortcut_path = os.path.join(startup_path, 'auto_startup.lnk')

    shell = win32com.client.Dispatch("WScript.Shell")
    shortcut = shell.CreateShortCut(shortcut_path)
    shortcut.TargetPath = script_path
    shortcut.WorkingDirectory = os.path.dirname(script_path)
    shortcut.save()
    log_message("已设置开机自启。")

# 从 chat.txt 中读取URL
def read_url_from_file():
    if os.path.exists(chat_file):
        with open(chat_file, 'r') as f:
            return f.read().strip()
    else:
        log_message(f"chat.txt 文件未找到。")
        return None

# 获取远端数据
def fetch_data(url):
    try:
        response = requests.get(url)
        if response.status_code == 200:
            return response.json()
        else:
            log_message(f"请求失败，状态码：{response.status_code}")
    except Exception as e:
        log_message(f"请求时出现错误：{e}")
    return None

# 读取本地保存的时间戳
def read_local_time():
    if os.path.exists(time_file):
        with open(time_file, 'r') as f:
            return int(f.read())
    return None

# 保存新的时间戳到本地
def save_local_time(new_time):
    with open(time_file, 'w') as f:
        f.write(str(new_time))

# 清理日志文件
def clear_log():
    with open(log_file, 'w') as f:
        f.write("")

def show_notification(title, message):
    # 获取系统当前默认编码
    sys_encoding = locale.getpreferredencoding()

    # 将 title 和 message 转换为系统默认编码
    encoded_title = title.encode(sys_encoding, errors='replace').decode(sys_encoding)
    encoded_message = message.encode(sys_encoding, errors='replace').decode(sys_encoding)

    # PowerShell 脚本字符串，包含通知逻辑
    ps_script = f"""
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null;
    $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02);
    $textNodes = $template.GetElementsByTagName("text");
    $textNodes.Item(0).AppendChild($template.CreateTextNode("{encoded_title}")) > $null;
    $textNodes.Item(1).AppendChild($template.CreateTextNode("{encoded_message}")) > $null;
    $toast = [Windows.UI.Notifications.ToastNotification]::new($template);

    # 获取 ToastNotifier 对象
    $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("chat.exe");
    $notifier.Show($toast);
    """
    
    # 创建临时文件来存储 PowerShell 脚本
    with tempfile.NamedTemporaryFile(delete=False, suffix=".ps1") as ps_file:
        ps_file.write(ps_script.encode(sys_encoding))
        ps_file_path = ps_file.name

    # 执行 PowerShell 脚本
    os.system(f'powershell -ExecutionPolicy Bypass -File "{ps_file_path}"')

# 主函数逻辑
def main():
    # 清理日志
    clear_log()
    
    # 设置开机自启
    set_autorun()
    
    # 从 chat.txt 中读取 URL
    url = read_url_from_file()
    if not url:
        log_message("未能读取有效的 URL，程序退出。")
        return
    
    # 获取本地保存的时间
    last_time = read_local_time()

    while True:
        # 获取远程数据
        data = fetch_data(url)

        if data:
            # 根据 'time' 键值排序，取最新的消息
            latest_message = max(data, key=lambda x: x['time'])
            latest_time = latest_message['time']
            message = latest_message['message']
            name = latest_message['name']
            log_message(f"latest_message: {latest_message}")

            # 对比时间戳
            if last_time is None or latest_time != last_time:
                if "call:" in message:
                    # 弹出通知
                    show_notification(name, message)
                    
                    # 保存最新的时间戳
                    save_local_time(latest_time)
                    log_message(f"弹出通知：{name} - {message}")

                    # 更新本地的时间戳记录
                    last_time = latest_time
        else:
            log_message("未获取到数据。")
        
        # 休眠60秒
        t.sleep(60)

if __name__ == "__main__":
    main()
