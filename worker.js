// 用于缓存 GET 请求的数据
const cache = new Map();

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 处理 OPTIONS 预检请求
  if (request.method === "OPTIONS") {
    return handleOptions();
  }

  let response;

  if (path === "/post" && request.method === "POST") {
    response = await handlePost(request);
  } else if (path === "/get" && request.method === "GET") {
    response = await handleGet(url);
  } else {
    response = new Response("未找到路径", { status: 404 });
  }

  // 设置允许跨域访问的响应头
  setCorsHeaders(response);
  return response;
}

// 设置 CORS 响应头
function setCorsHeaders(response) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
}

// 处理 OPTIONS 请求（CORS 预检请求）
function handleOptions() {
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Max-Age", "86400"); // 预检请求的缓存时间 (1天)

  return new Response(null, { status: 204, headers });
}

// 处理 POST 请求
async function handlePost(request) {
  try {
    const { id, name, message } = await request.json();

    // 检查参数是否缺失，或是否超出长度限制
    if (!id || !name || !message) {
      return new Response("参数缺失或无效", { status: 400 });
    }

    if (id.length > 50) {
      return new Response("id 长度超过 50 个字符", { status: 400 });
    }

    if (name.length > 50) {
      return new Response("name 长度超过 50 个字符", { status: 400 });
    }

    if (message.length > 5000) {
      return new Response("message 长度超过 5000 个字符", { status: 400 });
    }

    const time = Date.now();
    const newMessage = {
      name,
      message,
      time,
    };

    // 获取当前 id 下的消息列表
    let messages = await MESSAGE.get(id);
    messages = messages ? JSON.parse(messages) : [];

    // 将新消息追加到消息列表
    messages.push(newMessage);

    // 将消息列表存回 KV
    await MESSAGE.put(id, JSON.stringify(messages));

    // 清除对应 id 的缓存（因为数据有更新）
    cache.delete(id);

    return new Response("消息发送成功", { status: 200 });
  } catch (error) {
    return new Response("处理请求时出错", { status: 500 });
  }
}

// 处理 GET 请求
async function handleGet(url) {
  const id = url.searchParams.get("id");

  if (!id) {
    return new Response(JSON.stringify({}), { status: 200 });
  }

  // 检查缓存中是否有数据
  if (cache.has(id)) {
    return new Response(cache.get(id), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }

  // 如果缓存中没有数据，查询 KV
  const messages = await MESSAGE.get(id);

  if (!messages) {
    return new Response(JSON.stringify({ message: "未找到对应的频道" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }

  // 将数据存入缓存
  cache.set(id, messages);

  return new Response(messages, {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}
