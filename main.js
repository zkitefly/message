let chatId = '';
let chatName = '';
let fetchInterval;

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
    // fetchInterval = setInterval(fetchMessages, 15000);
}

// 发送消息
function sendMessage() {
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
        } else {
            return response.text().then(text => { throw new Error(text); });  // 抛出服务器返回的错误信息
        }
    })
    .catch(error => {
        console.error('发送消息时出错:', error);
        alert(`发送消息失败: ${error.message}`);
    });
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

            data.forEach(msg => {
                const messageElement = document.createElement('div');
                messageElement.classList.add('message');
                messageElement.innerHTML = `
                    <div><strong>${msg.name}:</strong> ${msg.message}</div>
                    <div class="timestamp">${new Date(msg.time + 8 * 60 * 60 * 1000).toLocaleString()}+8000</div>
                `;
                messagesContainer.appendChild(messageElement);
            });

            // 自动滚动到底部
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        })
        .catch(error => {
            console.error('获取消息时出错:', error);
            alert(`获取消息失败: ${error.message}`);
        });
}
