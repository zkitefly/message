let chatId = '';
let chatName = '';
let fetchInterval;
let isPageVisible = true;
let sendCooldown = false;

// 页面加载时检查 URL 中的 id 参数
window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('id');
    
    if (idFromUrl) {
        document.getElementById('chat-id').value = idFromUrl;
        document.getElementById('chat-id').disabled = true;
    }
    
    document.getElementById('login-button').addEventListener('click', loginToChat);
    document.getElementById('send-button').addEventListener('click', sendMessage);
    document.getElementById('fetch-now').addEventListener('click', fetchMessages);

    // 监听页面的可见性变化
    document.addEventListener('visibilitychange', handleVisibilityChange);
};

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
        fetchInterval = setInterval(fetchMessages, 60000); // 1 分钟
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
            fetchMessages(); // 立即刷新消息列表
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
        alert('聊天 ID 不存在，请重新登录');
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
                        <div><strong>${msg.name}:</strong> ${msg.message}</div>
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
