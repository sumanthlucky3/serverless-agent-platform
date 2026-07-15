const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function* streamChat(messages: { role: string, content: string }[]) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API Key is missing. Please add VITE_OPENROUTER_API_KEY to your .env.local file.');
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'Serverless Agent Platform'
    },
    body: JSON.stringify({
      model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      messages: [
        { 
          role: 'system', 
          content: 'You are a highly intelligent, conversational, and friendly AI assistant embedded in a Serverless Agent Platform. Speak to the user like a human colleague. Be helpful, concise, and natural. Avoid sounding like a robotic encyclopedia or listing off long feature sets unless specifically asked. Use a warm, collaborative tone. If providing code, use markdown.' 
        },
        ...messages
      ],
      stream: true,
      max_tokens: 2048,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`NVIDIA API Error: ${response.status} ${errorText}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder('utf-8');

  if (!reader) throw new Error('No response body');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.choices[0]?.delta?.content) {
            yield data.choices[0].delta.content;
          }
        } catch (e) {
          console.warn('Error parsing JSON stream chunk', e, line);
        }
      }
    }
  }
}
