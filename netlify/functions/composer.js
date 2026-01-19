const OpenAI = require('openai');

exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const body = JSON.parse(event.body);
        const melody = body.melody;
        const userApiKey = body.apiKey; // <--- 获取用户传来的 Key

        // 安全检查：如果没有 Key，直接驳回
        if (!userApiKey) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing API Key" })
            };
        }

        // 动态初始化 OpenAI 客户端 (使用 DeepSeek 的 BaseURL)
        const openai = new OpenAI({
            apiKey: userApiKey, 
            baseURL: 'https://api.deepseek.com' 
        });

        // Prompt 保持不变（这是你的核心壁垒）
        const systemPrompt = `
        你是一个世界级的古典音乐作曲家。
        你的任务是将用户提供的【单声部主旋律】扩展为严谨的【四部和声 (SATB)】。
        要求：
        1. 使用 ABC Notation (ABC记谱法) 输出。
        2. 包含 headers: X:1, T:AI Orchestration, M:4/4, L:1/4, K:C, V:1, V:2, V:3, V:4。
        3. 严格遵守传统和声学规则。
        4. 只返回 ABC 代码块，不要废话。
        `;

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `主旋律是: ${melody}` }
            ],
            model: "deepseek-chat", // 强制使用 deepseek
        });

        const result = completion.choices[0].message.content;
        const cleanResult = result.replace(/```abc/g, "").replace(/```/g, "").trim();

        return {
            statusCode: 200,
            body: JSON.stringify({ result: cleanResult }),
        };

    } catch (error) {
        console.error("Error:", error);
        
        // 如果是 401，说明用户的 Key 不对
        if (error.status === 401) {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: "您的 API Key 无效或已过期，请检查 DeepSeek 后台。" })
            };
        }
        
        // 如果是 402/429，说明用户没钱了
        if (error.status === 402 || error.status === 429) {
             return {
                statusCode: 429,
                body: JSON.stringify({ error: "您的 DeepSeek 账户余额不足。" })
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({ error: "服务器内部错误: " + error.message }),
        };
    }
};
