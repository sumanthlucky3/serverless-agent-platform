const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// A message content part — either plain text or an image
export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

// A chat message — content can be a plain string OR an array of parts (vision)
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentPart[];
}

/** Convert a File to a base64 data-URL (needed for vision API) */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/** Build a multimodal user content array from text + image files */
export async function buildVisionContent(text: string, images: File[]): Promise<ContentPart[]> {
  const parts: ContentPart[] = [];
  for (const img of images) {
    const dataUrl = await fileToDataURL(img);
    parts.push({ type: 'image_url', image_url: { url: dataUrl } });
  }
  if (text.trim()) {
    parts.push({ type: 'text', text });
  }
  return parts;
}

/**
 * Stream a chat response from OpenRouter.
 * Messages follow the OpenAI format; content can be a string or an array of parts
 * (the latter enables vision / multimodal models to see attached images).
 */
export async function* streamChat(messages: ChatMessage[]) {
  if (!OPENROUTER_API_KEY) {
    throw new Error(
      'OpenRouter API Key is missing. Please add VITE_OPENROUTER_API_KEY to your .env.local file.'
    );
  }

  // Use a free vision-capable model so images are actually understood
  const model = 'google/gemini-2.0-flash-exp:free';

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer':  'http://localhost:5173',
      'X-Title':       'Serverless Agent Platform',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a highly intelligent, multimodal AI assistant embedded in a Serverless Agent Platform. ' +
            'You can see and understand images that the user attaches. ' +
            'Speak like a smart, friendly colleague. Be helpful and concise. ' +
            'Use markdown for code. When the user sends an image, analyse it carefully and respond accurately.',
        },
        ...messages,
      ],
      stream: true,
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API Error: ${response.status} — ${errorText}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder('utf-8');
  if (!reader) throw new Error('No response body');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
        try {
          const data = JSON.parse(line.slice(6));
          const token = data.choices?.[0]?.delta?.content;
          if (token) yield token;
        } catch {
          // Partial chunk — ignore
        }
      }
    }
  }
}
