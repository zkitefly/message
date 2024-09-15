export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
      return handleOptions(res);
    }
  
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }
  
    try {
      const { id, name, message } = req.body;
  
      // 检查参数
      if (!id || !name || !message) {
        return res.status(400).send('参数缺失或无效');
      }
  
      if (id.length > 50) {
        return res.status(400).send('id 长度超过 50 个字符');
      }
  
      if (message.length > 5000) {
        return res.status(400).send('message 长度超过 5000 个字符');
      }
  
      const time = Date.now();
      const key = `${id}-${time}`;
  
      const data = { id, name, message, time };
  
      await saveMessage(key, data);
  
      res.status(200).send('消息发送成功');
    } catch (error) {
      res.status(500).send('处理请求时出错');
    }
  }
  
  // 处理 OPTIONS 请求
  function handleOptions(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400'); // 1 天
    res.status(204).end();
  }
  