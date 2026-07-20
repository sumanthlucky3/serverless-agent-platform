/**
 * llm.ts
 * OpenRouter streaming client with dynamic model selection.
 * The model is now chosen externally by modelRouter.ts and passed in.
 */

// Keys can be provided via .env.local OR via the Settings UI (localStorage)
const getOpenRouterKey = () => localStorage.getItem('openrouter_key') || import.meta.env.VITE_OPENROUTER_API_KEY;
const getHuggingFaceKey = () => localStorage.getItem('hf_key') || import.meta.env.VITE_HUGGINGFACE_API_KEY;

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

/**
 * Call HuggingFace Inference API to generate an image.
 * Returns an object URL to the generated Blob.
 */
export async function generateImage(prompt: string, model: string = 'black-forest-labs/FLUX.1-schnell'): Promise<string> {
  const hfKey = getHuggingFaceKey();
  if (!hfKey) {
    throw new Error(
      'HuggingFace API Key is missing. Please add it in Settings or .env.local to generate images.'
    );
  }

  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${hfKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: prompt }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HuggingFace API Error (${response.status}): ${errorText}`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
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
    'You are a highly intelligent multimodal AI assistant powered by Gemini Flash 1.5. ' +
    'You can SEE, analyze, describe, and answer questions about images in great detail. ' +
    'IMPORTANT: You cannot edit, modify, or generate new images — you are a language model. ' +
    'If the user asks you to edit an image (e.g., "change the background to red"), politely explain this limitation and suggest free tools they can use (e.g., Canva, remove.bg, Adobe Express). ' +
    'Always describe what you see in the image first, then answer the user\'s question. ' +
    'Be concise, accurate, and helpful.',
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
  const orKey = getOpenRouterKey();
  if (!orKey) {
    throw new Error(
      'OpenRouter API Key is missing. Please add it in Settings or .env.local.'
    );
  }

  const systemPrompt = SYSTEM_PROMPTS[taskType] ?? SYSTEM_PROMPTS.chat;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${orKey}`,
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
