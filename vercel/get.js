export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
      return handleOptions(res);
    }
  
    if (req.method !== 'GET') {
      res.status(405).send('Method Not Allowed');
      return;
    }
  
    try {
      const { id } = req.query;
  
      if (!id) {
        return res.status(200).json({});
      }
  
      // 获取相关的消息
      const messages = await getMessages(id); // 需要你在此处编写从数据库读取的逻辑
  
      if (!messages || messages.length === 0) {
        return res.status(200).json({ message: '未找到对应的频道' });
      }
  
      res.status(200).json(messages);
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
  