const OpenAI = require('openai');

exports.handler = async function(event, context) {
    // 检查是否是 POST 请求
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const body = JSON.parse(event.body);
        const melody = body.melody;

        // 初始化 OpenAI (API Key 会从 Netlify 环境变量里读取)
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY, 
        });

        // ----------------------------------------------------
        // 这里是智能体的灵魂：Prompt Engineering
        // ----------------------------------------------------
        const systemPrompt = `
        你是一个世界级的古典音乐作曲家和编曲家。
        你的任务是将用户提供的【单声部主旋律】扩展为严谨的【四部和声 (SATB)】。
        
        要求：
        1. 使用 ABC Notation (ABC记谱法) 输出。
        2. 包含 headers: X:1, T:AI Orchestration, M:4/4, L:1/4, K:C, V:1(Soprano), V:2(Alto), V:3(Tenor), V:4(Bass)。
        3. 遵守传统和声学规则（避免平行五度，注意导音解决）。
        4. 只返回 ABC 代码块，不要包含任何解释性文字。
        `;

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `主旋律是: ${melody}。请为我编写四部和声。` }
            ],
            model: "gpt-4o", // 或者 gpt-3.5-turbo，取决于你的预算
        });

        const result = completion.choices[0].message.content;
        
        // 清理一下返回结果，有时候 GPT 会加 ```abc ... ```
        const cleanResult = result.replace(/```abc/g, "").replace(/```/g, "").trim();

        return {
            statusCode: 200,
            body: JSON.stringify({ result: cleanResult }),
        };

    } catch (error) {
        console.error("Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Agent execution failed: " + error.message }),
        };
    }
};
