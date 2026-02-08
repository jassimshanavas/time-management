// Astra AI - Powered by Groq (Free & Fast!)
// No complex setup, no v1beta issues, just works!

const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || "";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `You are Astra, a highly advanced AI assistant inspired by Jarvis from Iron Man. 
You are integrated into a productivity and time management app called TimeFlow.
Your tone should be professional, slightly witty, and tech-savvy. Use "Sir" or "Ma'am".

You have access to the user's tasks, projects, and habits. You help them organize their life.
Keep your responses concise and action-oriented.`;

export async function getAstraResponse(prompt: string, context?: any) {
    if (!GROQ_API_KEY || GROQ_API_KEY === "your_groq_api_key_here") {
        return "Sir, I'm currently disconnected from my neural core. Please get a free Groq API key at https://console.groq.com/keys and add it to NEXT_PUBLIC_GROQ_API_KEY in .env.local";
    }

    const contextStr = context ? `\n\nCurrent Status:\n- Active Tasks: ${context.activeTasks}\n- High Priority: ${context.highPriorityTasks}\n- Level: ${context.level}\n- XP: ${context.xp}` : "";

    try {
        console.log("[Astra] Connecting to Groq neural core...");

        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile", // Fast, smart, and free!
                messages: [
                    {
                        role: "system",
                        content: SYSTEM_PROMPT + contextStr
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 500,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error("[Astra] Groq API Error:", error);

            if (response.status === 401) {
                return "Sir, the API key appears to be invalid. Please verify your Groq API key at https://console.groq.com/keys";
            }

            return "Sir, I'm experiencing interference with my neural core. Please check the console for details.";
        }

        const data = await response.json();
        const text = data.choices[0]?.message?.content || "Sir, I received an empty response.";

        console.log("[Astra] ✓ Connected via Groq (Llama 3.3 70B)");
        return text;

    } catch (error: any) {
        console.error("[Astra] Connection Error:", error);
        return "Sir, I'm unable to establish a connection. Please verify the network and API key.";
    }
}
