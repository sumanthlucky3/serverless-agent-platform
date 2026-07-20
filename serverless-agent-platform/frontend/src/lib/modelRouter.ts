/**
 * modelRouter.ts
 * Analyzes the user's message and automatically selects the best free LLM
 * from OpenRouter's free tier. Falls back gracefully if a model is unavailable.
 */

export type TaskType = 'vision' | 'code' | 'reasoning' | 'creative' | 'chat' | 'image_generation';

export interface ModelProfile {
  id: string;           // OpenRouter or HF model ID
  displayName: string;  // Human-readable name
  taskType: TaskType;
  emoji: string;
  tagline: string;      // Short capability description
  reason: string;       // Why this model was selected for the task
  contextWindow: string;
  speed: 'fast' | 'medium' | 'slow';
}

/** All available free-tier models on OpenRouter (verified working 2026) */
export const MODEL_CATALOG: Record<TaskType, ModelProfile> = {
  image_generation: {
    id: 'black-forest-labs/FLUX.1-schnell',
    displayName: 'FLUX.1 Schnell (HF)',
    taskType: 'image_generation',
    emoji: '🎨',
    tagline: 'Text-to-Image · Fast Generation',
    reason: 'Image generation intent detected — routing to HuggingFace FLUX for fast high-quality image generation.',
    contextWindow: 'N/A',
    speed: 'fast',
  },
  vision: {
    id: 'nvidia/nemotron-nano-12b-v2-vl:free',
    displayName: 'Nemotron Nano 12B VL',
    taskType: 'vision',
    emoji: '👁️',
    tagline: 'Multimodal · Image Understanding',
    reason: 'Image detected — Nemotron Nano 12B VL is a reliable free vision model and can see, describe, and analyze images.',
    contextWindow: '4K',
    speed: 'fast',
  },
  code: {
    id: 'cohere/north-mini-code:free',
    displayName: 'Cohere North Mini Code',
    taskType: 'code',
    emoji: '💻',
    tagline: 'Code Generation · Debugging · Review',
    reason: 'Programming keywords detected — routing to a dedicated code-specialist model.',
    contextWindow: '128K',
    speed: 'medium',
  },
  reasoning: {
    id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    displayName: 'Nemotron 3 Reasoning 30B',
    taskType: 'reasoning',
    emoji: '🧠',
    tagline: 'Chain-of-Thought · Deep Analysis',
    reason: 'Complex analytical task — routing to a reasoning model with extended thinking.',
    contextWindow: '32K',
    speed: 'slow',
  },
  creative: {
    id: 'poolside/laguna-m.1:free',
    displayName: 'Laguna M.1',
    taskType: 'creative',
    emoji: '✨',
    tagline: 'Creative Writing · Stories · Marketing',
    reason: 'Creative task detected — Laguna excels at expressive, fluent prose generation.',
    contextWindow: '32K',
    speed: 'fast',
  },
  chat: {
    id: 'google/gemma-4-31b-it:free',
    displayName: 'Gemma 4 31B',
    taskType: 'chat',
    emoji: '💬',
    tagline: 'General Assistant · Q&A · Conversation',
    reason: 'General conversation — Gemma 4 31B is a highly capable general-purpose model.',
    contextWindow: '128K',
    speed: 'medium',
  },
};


/** Keyword patterns for each task type (order matters — first match wins) */
const TASK_PATTERNS: Array<{ type: TaskType; pattern: RegExp; label: string }> = [
  // Image Generation
  {
    type: 'image_generation',
    label: 'Image generation request detected',
    pattern:
      /\b(generate|create|draw|paint|render|edit|change)\b.*(?:image|picture|photo|background|art)/i,
  },
  // Code / Engineering
  {
    type: 'code',
    label: 'Programming keywords detected',
    pattern:
      /\b(code|function|class|import|export|debug|error|bug|typescript|javascript|python|react|sql|api|endpoint|git|npm|deploy|dockerfile|kubernetes|bash|shell|script|algorithm|array|object|type|interface|component|hook|async|await|fetch|regex|database|query|schema|migration|test|unit test|jest|lint)\b/i,
  },
  // Reasoning / Analysis
  {
    type: 'reasoning',
    label: 'Analytical reasoning task detected',
    pattern:
      /\b(analyze|analysis|compare|evaluate|explain why|reason|logic|solve|calculate|math|research|pros and cons|trade.?off|evaluate|decision|strategy|plan|architecture|design pattern|system design|audit|review)\b/i,
  },
  // Creative writing
  {
    type: 'creative',
    label: 'Creative task detected',
    pattern:
      /\b(write|story|poem|creative|imagine|design|blog|essay|caption|tweet|marketing|copy|draft|narrate|fiction|character|plot|script|ad|tagline|slogan|pitch)\b/i,
  },
];

export interface RoutingResult {
  taskType: TaskType;
  model: ModelProfile;
  signals: string[];
  durationMs: number;
}

/**
 * Analyze the user's message and attached files to pick the best free LLM.
 * Returns the routing result with the selected model and reasoning.
 */
export async function routeModel(
  message: string,
  hasImages: boolean
): Promise<RoutingResult> {
  const start = Date.now();
  // Simulate a brief "thinking" delay so the UI animation is visible
  await new Promise(r => setTimeout(r, 600 + Math.random() * 400));

  const signals: string[] = [];

  // 1. Vision wins immediately if images are present
  if (hasImages) {
    signals.push('🖼️ Image attachment detected');
    signals.push('🔀 Routing to multimodal vision model');
    return {
      taskType: 'vision',
      model: MODEL_CATALOG.vision,
      signals,
      durationMs: Date.now() - start,
    };
  }

  // 2. Check keyword patterns in order
  for (const { type, pattern, label } of TASK_PATTERNS) {
    if (pattern.test(message)) {
      signals.push(`🔍 ${label}`);
      signals.push(`🔀 Routing to ${MODEL_CATALOG[type].displayName}`);
      return {
        taskType: type,
        model: MODEL_CATALOG[type],
        signals,
        durationMs: Date.now() - start,
      };
    }
  }

  // 3. Default: general chat
  signals.push('💬 General conversation detected');
  signals.push('🔀 Using best general-purpose model');
  return {
    taskType: 'chat',
    model: MODEL_CATALOG.chat,
    signals,
    durationMs: Date.now() - start,
  };
}

/* ─── Spell Correction ─────────────────────────────────────── */

/** Common misspellings → correct word */
export const SPELL_CORRECTIONS: Record<string, string> = {
  teh: 'the', hte: 'the', adn: 'and', nad: 'and', fo: 'of',
  recieve: 'receive', occured: 'occurred', accomodate: 'accommodate',
  seperate: 'separate', definately: 'definitely', untill: 'until',
  wierd: 'weird', beleive: 'believe', occurance: 'occurrence',
  independant: 'independent', existance: 'existence',
  tommorrow: 'tomorrow', tommorow: 'tomorrow', tomarrow: 'tomorrow',
  yestarday: 'yesterday', calender: 'calendar',
  writting: 'writing', comming: 'coming', runing: 'running',
  basicaly: 'basically', actualy: 'actually', realy: 'really',
  probaly: 'probably', usualy: 'usually', manualy: 'manually',
  chnage: 'change', cahnge: 'change', cnacel: 'cancel',
  feautre: 'feature', featrue: 'feature', funtcion: 'function',
  fucntion: 'function', iamge: 'image', imge: 'image', imgae: 'image',
  attched: 'attached', attatch: 'attach', identfy: 'identify',
  plz: 'please', pls: 'please', u: 'you', ur: 'your', r: 'are',
  wanna: 'want to', gonna: 'going to', kinda: 'kind of',
  becasue: 'because', becuse: 'because', beacuse: 'because',
  doesnt: "doesn't", dont: "don't", cant: "can't", wont: "won't",
  shouldnt: "shouldn't", wouldnt: "wouldn't", couldnt: "couldn't",
  thier: 'their', there: 'there', its: 'its',
  langauge: 'language', languge: 'language',
  programing: 'programming', porgramming: 'programming',
  developement: 'development', developement: 'development',
  enviroment: 'environment', enviorment: 'environment',
  integeration: 'integration', intergration: 'integration',
  auhtentication: 'authentication', authentcation: 'authentication',
  autmoation: 'automation', auttomation: 'automation',
  moduel: 'module', moudle: 'module',
  repositry: 'repository', repostiory: 'repository',
  configuartion: 'configuration', configuraton: 'configuration',
};

/**
 * Check the last word in the input for a known misspelling.
 * Returns { original, suggestion } or null if no correction found.
 */
export function checkSpelling(text: string): { original: string; suggestion: string } | null {
  const words = text.trimEnd().split(/\s+/);
  const lastWord = words[words.length - 1]?.toLowerCase().replace(/[^a-z']/g, '');
  if (!lastWord || lastWord.length < 3) return null;
  const correction = SPELL_CORRECTIONS[lastWord];
  return correction ? { original: words[words.length - 1], suggestion: correction } : null;
}
