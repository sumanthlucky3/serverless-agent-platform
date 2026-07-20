/**
 * llm.ts
 * OpenRouter streaming client with dynamic model selection.
 * The model is now chosen externally by modelRouter.ts and passed in.
 */

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

/** System prompt per task type */
const SYSTEM_PROMPTS: Record<string, string> = {
  vision:
    'You are a highly intelligent multimodal AI assistant. ' +
    'You can see, analyze, and describe images in detail. ' +
    'When the user sends an image, examine it carefully and answer accurately. ' +
    'Be concise, friendly, and professional.',
  code:
    'You are an expert software engineer and code assistant. ' +
    'Write clean, well-commented, production-ready code. ' +
    'Always explain your solution briefly before presenting code. ' +
    'Use markdown code blocks with the correct language tag.',
  reasoning:
    'You are a rigorous analytical AI. ' +
    'Think step-by-step (chain-of-thought) before giving your final answer. ' +
    'Show your reasoning clearly. Be thorough but concise.',
  creative:
    'You are a creative writing and marketing AI assistant. ' +
    'Write with flair, originality, and a strong voice. ' +
    'Adapt your tone to what the user needs.',
  chat:
    'You are a helpful, friendly, and highly capable AI assistant. ' +
    'Speak like a smart, supportive colleague. ' +
    'Be concise and natural. Use markdown for structured answers.',
};

/**
 * Stream a chat response from OpenRouter using the provided model ID.
 * The caller (modelRouter) is responsible for choosing the right model.
 */
export async function* streamChat(
  messages: ChatMessage[],
  modelId: string,
  taskType: string = 'chat'
) {
  if (!OPENROUTER_API_KEY) {
    throw new Error(
      'OpenRouter API Key is missing. Please add VITE_OPENROUTER_API_KEY to your .env.local file.'
    );
  }

  const systemPrompt = SYSTEM_PROMPTS[taskType] ?? SYSTEM_PROMPTS.chat;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer':  window.location.origin,
      'X-Title':       'Serverless Agent Platform',
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      stream: true,
      max_tokens: 2048,
      temperature: taskType === 'reasoning' ? 0.3 : taskType === 'creative' ? 0.9 : 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API Error (${response.status}): ${errorText}`);
  }

  const reader  = response.body?.getReader();
  const decoder = new TextDecoder('utf-8');
  if (!reader) throw new Error('No response body received from API.');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
        try {
          const data  = JSON.parse(line.slice(6));
          const token = data.choices?.[0]?.delta?.content;
          if (token) yield token;
        } catch {
          // Partial / malformed chunk — skip silently
        }
      }
    }
  }
}
