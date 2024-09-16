let chatId = '';
let chatName = '';
let fetchInterval;
let isPageVisible = true;
let sendCooldown = false;

// 页面加载时检查 URL 中的 id 参数
window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('id');
    const nameFromUrl = urlParams.get('name');

    if (idFromUrl) {
        document.getElementById('chat-id').value = idFromUrl;
        document.getElementById('chat-id').disabled = true;
    }

    if (nameFromUrl) {
        document.getElementById('chat-name').value = nameFromUrl;
        document.getElementById('chat-name').disabled = true;
    }

    if (nameFromUrl && idFromUrl) {
        setInterval(loginToChat, 1000);
    }

    document.getElementById('login-button').addEventListener('click', loginToChat);
    document.getElementById('send-button').addEventListener('click', sendMessage);
    document.getElementById('fetch-now').addEventListener('click', fetchMessages);
    document.getElementById('upload-button').addEventListener('click', uploadFile);
    document.getElementById('paste-button').addEventListener('click', pasteFromClipboard);

    // 监听页面的可见性变化
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 绑定回车键操作
    bindEnterKey();
};

function pasteFromClipboard() {
    navigator.permissions.query({ name: 'clipboard-read' }).then(permissionStatus => {
        if (permissionStatus.state === 'granted' || permissionStatus.state === 'prompt') {
            navigator.clipboard.readText()
                .then(text => {
                    const messageInput = document.getElementById('message-input');
                    messageInput.value = text;
                })
                .catch(error => {
                    console.error('粘贴内容时出错:', error);
                    alert('无法从剪贴板粘贴内容');
                });
        } else {
            alert('请在浏览器设置中允许访问剪贴板');
        }
    }).catch(error => {
        console.error('检查剪贴板权限时出错:', error);
        alert('无法检查剪贴板权限');
    });
}

function uploadFile() {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];

    if (!file) {
        alert('请选择一个文件上传');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    fetch('https://file.io', {
        method: 'POST',
        body: formData
    })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => { throw new Error(text); });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                const messageInput = document.getElementById('message-input');
                messageInput.value = data.link;
            } else {
                throw new Error(data.message);
            }
        })
        .catch(error => {
            console.error('文件上传时出错:', error);
            alert(`文件上传失败: ${error.message}`);
        });
}

// 绑定回车键操作
function bindEnterKey() {
    const idInput = document.getElementById('chat-id');
    const nameInput = document.getElementById('chat-name');
    const messageInput = document.getElementById('message-input');

    // 在频道 ID 或用户名输入框按下回车时，登录
    idInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            loginToChat();
        }
    });

    nameInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            loginToChat();
        }
    });

    // 在消息输入框按下回车时，发送消息
    messageInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault(); // 防止回车换行
            sendMessage();
        }
    });
}

// 登录并初始化聊天
function loginToChat() {
    const idInput = document.getElementById('chat-id');
    const nameInput = document.getElementById('chat-name');

    if (!nameInput.value || !idInput.value) {
        alert('请输入频道 ID 和用户名');
        return;
    }

    chatId = idInput.value;
    chatName = nameInput.value;

    // 显示频道 ID 和用户名
    document.getElementById('display-chat-id').textContent = `频道 ID: ${chatId}`;
    document.getElementById('display-chat-name').textContent = `用户名: ${chatName}`;

    // 隐藏登录界面，显示聊天界面
    document.getElementById('login').style.display = 'none';
    document.getElementById('chat').style.display = 'block';

    // 开始每 15 秒获取聊天记录
    fetchMessages();
    fetchInterval = setInterval(fetchMessages, 15000); // 默认 15 秒
}

// 处理页面可见性变化
function handleVisibilityChange() {
    if (document.hidden) {
        // 当页面不可见时，调整为每 1 分钟获取一次
        clearInterval(fetchInterval);
        fetchInterval = setInterval(fetchMessages, 600000); // 10 分钟
        isPageVisible = false;
    } else {
        // 当页面可见时，立即刷新并恢复至 15 秒
        clearInterval(fetchInterval);
        fetchMessages(); // 立即获取一次消息
        fetchInterval = setInterval(fetchMessages, 15000); // 恢复 15 秒
        isPageVisible = true;
    }
}

// 发送消息
function sendMessage() {
    // 检查冷却状态
    if (sendCooldown) {
        alert('发送冷却中，请稍候再试');
        return;
    }

    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();

    if (!message) {
        alert('请输入消息');
        return;
    }

    // 发送消息到服务器
    fetch('https://message.zkitefly.eu.org/post', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            id: chatId,
            name: chatName,
            message: message
        })
    })
        .then(response => {
            if (response.ok) {
                messageInput.value = ''; // 清空输入框
                fetchMessages(); // 刷新消息
                startCooldown(); // 开始冷却
            } else {
                return response.text().then(text => { throw new Error(text); });  // 抛出服务器返回的错误信息
            }
        })
        .catch(error => {
            console.error('发送消息时出错:', error);
            alert(`发送消息失败: ${error.message}`);
        });
}

// 开始冷却
function startCooldown() {
    const sendButton = document.getElementById('send-button');
    sendCooldown = true;
    sendButton.disabled = true;

    // 设置5秒冷却
    setTimeout(() => {
        sendCooldown = false;
        sendButton.disabled = false;
    }, 5000); // 5秒后解除冷却
}

// 获取聊天记录
function fetchMessages() {
    if (!chatId) {
        return;
    }

    fetch(`https://message.zkitefly.eu.org/get?id=${chatId}`)
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => { throw new Error(text); });
            }
            return response.json();
        })
        .then(data => {
            const messagesContainer = document.getElementById('messages');
            messagesContainer.innerHTML = ''; // 清空旧消息

            // 检查 data 是否为数组并且是否有内容
            if (Array.isArray(data) && data.length > 0) {
                data.forEach(msg => {
                    const messageElement = document.createElement('div');
                    messageElement.classList.add('message');
                    messageElement.innerHTML = `
                        <div class="container"><strong class="name">${msg.name}: </strong><span class="message">${msg.message}</span></div>
                        <div class="timestamp">${formatTime(msg.time)}</div>
                    `;
                    messagesContainer.appendChild(messageElement);
                });
            } else {
                // 如果没有消息，显示一个占位符提示
                messagesContainer.innerHTML = '<div class="no-messages">暂无消息</div>';
            }

            // 自动滚动到底部
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        })
        .catch(error => {
            console.error('获取消息时出错:', error);
            alert(`获取消息失败: ${error.message}`);
        });
}

// 格式化时间
function formatTime(timestamp) {
    const date = new Date(timestamp + 8 * 60 * 60 * 1000); // Assuming the time is UTC, and you want to adjust to UTC+8
    return date.toLocaleString();
}
