import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Bot, Paperclip, Send, ArrowLeft, GitBranch, Database,
  FileText, BarChart2, Zap, Image as ImageIcon, X,
  Cpu, CheckCircle2, Clock,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../lib/supabase';
import { streamChat, buildVisionContent, type ChatMessage, type ContentPart } from '../lib/llm';
import {
  routeModel, checkSpelling, MODEL_CATALOG,
  type RoutingResult, type ModelProfile,
} from '../lib/modelRouter';

/* ── Types ────────────────────────────────────────────────── */

interface Agent {
  id: string; name: string; description: string;
  icon: string; color: string; status: string; run_count: number;
}

interface UIMessage {
  role: 'user' | 'assistant';
  content: string | ContentPart[];
  previewUrls?: string[];
  modelUsed?: string;
}

type RoutingState = 'idle' | 'analyzing' | 'done';

const ICON_MAP: Record<string, React.ElementType> = {
  'bot': Bot, 'file-text': FileText, 'briefcase': BarChart2,
};

/* ══════════════════════════════════════════════════════════════
   AGENT HUB — card grid
   ══════════════════════════════════════════════════════════════ */
export function Agents() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('agents').select('*').order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setAgents(data); setLoading(false); });
  }, []);

  if (agentId) return <AgentWorkspace agentId={agentId} onBack={() => navigate('/agents')} />;

  return (
    <div className="page-enter" style={{ paddingBottom: 32 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">Agent <span className="gradient-text">Hub</span></h1>
        <p className="page-subtitle">Select an agent to begin your next mission.</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', height: 200, alignItems: 'center' }}>
          <div style={{ width: 36, height: 36, border: '2px solid transparent', borderTopColor: 'var(--cyan)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
      ) : (
        <div className="agent-grid">
          {agents.map(agent => {
            const Icon = ICON_MAP[agent.icon] || Bot;
            const isActive = agent.status === 'active';
            return (
              <div key={agent.id} className="glass-card agent-card"
                style={{ '--agent-color': agent.color, '--agent-color-glow': agent.color + '40', display: 'flex', flexDirection: 'column', opacity: isActive ? 1 : 0.65 } as React.CSSProperties}
                onClick={() => isActive && navigate(`/agents/${agent.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                  <div className="agent-icon-wrap" style={{ background: agent.color + '18', border: `1px solid ${agent.color}30`, boxShadow: `0 0 16px ${agent.color}20` }}>
                    <Icon size={24} color={agent.color} />
                  </div>
                  <span className={isActive ? 'badge badge-active' : 'badge badge-soon'}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                    {isActive ? 'Active' : 'Soon'}
                  </span>
                </div>
                <h2 className="agent-name">{agent.name}</h2>
                <p className="agent-desc">{agent.description}</p>
                <div className="agent-footer">
                  <span className="agent-runs">{agent.run_count} runs</span>
                  {isActive
                    ? <button className="btn-primary" onClick={e => { e.stopPropagation(); navigate(`/agents/${agent.id}`); }}>Run Agent →</button>
                    : <button className="btn-ghost">Notify Me</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   AGENT WORKSPACE — professional chat with model routing
   ══════════════════════════════════════════════════════════════ */
function AgentWorkspace({ agentId, onBack }: { agentId: string; onBack: () => void }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<UIMessage[]>([
    { role: 'assistant', content: "Hello! I'm ready to help. Type a message or attach an image — I'll automatically pick the best AI model for your task." },
  ]);
  const [agentName, setAgentName] = useState('General Assistant');
  const [agentColor, setAgentColor] = useState('var(--cyan)');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [attachedPreviews, setAttachedPreviews] = useState<string[]>([]);

  // Model routing state
  const [routingState, setRoutingState] = useState<RoutingState>('idle');
  const [routingResult, setRoutingResult] = useState<RoutingResult | null>(null);
  const [routingSignals, setRoutingSignals] = useState<string[]>([]);
  const [currentModel, setCurrentModel] = useState<ModelProfile>(MODEL_CATALOG.chat);

  // Spell check
  const [spellSuggestion, setSpellSuggestion] = useState<{ original: string; suggestion: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from('agents').select('name, color').eq('id', agentId).single()
      .then(({ data }) => { if (data) { setAgentName(data.name); setAgentColor(data.color); } });

    return () => { attachedPreviews.forEach(u => URL.revokeObjectURL(u)); };
  }, [agentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── Spell check on input change ── */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    if (val.endsWith(' ')) {
      const match = checkSpelling(val.trimEnd());
      setSpellSuggestion(match);
    } else {
      setSpellSuggestion(null);
    }
  }, []);

  const applySpellCorrection = () => {
    if (!spellSuggestion) return;
    setInput(prev => {
      const words = prev.trimEnd().split(' ');
      words[words.length - 1] = spellSuggestion.suggestion;
      return words.join(' ') + ' ';
    });
    setSpellSuggestion(null);
  };

  /* ── File handling ── */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles    = Array.from(e.target.files);
    const newPreviews = newFiles.map(f => f.type.startsWith('image/') ? URL.createObjectURL(f) : '');
    setAttachedFiles(prev => [...prev, ...newFiles]);
    setAttachedPreviews(prev => [...prev, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (idx: number) => {
    if (attachedPreviews[idx]) URL.revokeObjectURL(attachedPreviews[idx]);
    setAttachedFiles(prev    => prev.filter((_, i) => i !== idx));
    setAttachedPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  /* ── Send ── */
  const handleSend = async () => {
    const textInput = input.trim();
    if ((!textInput && attachedFiles.length === 0) || isStreaming) return;

    const imageFiles  = attachedFiles.filter(f => f.type.startsWith('image/'));
    const previewSnap = [...attachedPreviews];

    const userMsg: UIMessage = {
      role: 'user',
      content: textInput || ' ',
      previewUrls: previewSnap.filter(Boolean),
    };

    const historyBefore = [...messages];
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachedFiles([]);
    setAttachedPreviews([]);
    setSpellSuggestion(null);

    // ── Step 1: Route to best model ──
    setRoutingState('analyzing');
    setRoutingSignals([]);

    const result = await routeModel(textInput, imageFiles.length > 0);
    setRoutingResult(result);
    setRoutingSignals(result.signals);
    setCurrentModel(result.model);
    setRoutingState('done');

    // ── Step 2: Stream response ──
    setIsStreaming(true);
    setMessages(prev => [...prev, { role: 'assistant', content: '', modelUsed: result.model.displayName }]);

    let currentSessionId = sessionId;
    try {
      if (!currentSessionId) {
        const { data: ns } = await supabase
          .from('agent_sessions')
          .insert({ agent_id: agentId, title: textInput.slice(0, 60) || 'Image Task', status: 'active' })
          .select('id').single();
        if (ns) { currentSessionId = ns.id; setSessionId(currentSessionId); }
      }

      if (currentSessionId) {
        await supabase.from('agent_messages').insert({
          session_id: currentSessionId, role: 'user',
          content: textInput || '[image attached]',
        });
      }

      // Build API history
      const apiHistory: ChatMessage[] = await Promise.all(
        [...historyBefore, userMsg].map(async (m): Promise<ChatMessage> => {
          if (m === userMsg && imageFiles.length > 0) {
            return { role: 'user', content: await buildVisionContent(textInput, imageFiles) };
          }
          const text = typeof m.content === 'string'
            ? m.content
            : (m.content as ContentPart[]).find(p => p.type === 'text')?.text ?? '';
          return { role: m.role, content: text };
        })
      );

      const stream = streamChat(apiHistory, result.model.id, result.taskType);
      let fullResponse = '';
      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: fullResponse, modelUsed: result.model.displayName };
          return updated;
        });
      }

      if (currentSessionId && fullResponse) {
        await supabase.from('agent_messages').insert({
          session_id: currentSessionId, role: 'assistant', content: fullResponse,
        });
      }
    } catch (err: any) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `**Error:** ${err.message}\n\n*Tip: Make sure your OpenRouter API key is set in \`.env.local\` as \`VITE_OPENROUTER_API_KEY\`.*`,
          modelUsed: result.model.displayName,
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === 'Tab' && spellSuggestion) { e.preventDefault(); applySpellCorrection(); }
  };

  const getTextContent = (msg: UIMessage) =>
    typeof msg.content === 'string'
      ? msg.content
      : (msg.content as ContentPart[]).find(p => p.type === 'text')?.text ?? '';

  /* ── Render ── */
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', background: 'rgba(3,4,10,0.95)', backdropFilter: 'blur(24px)', animation: 'fadeUp 0.3s ease forwards' }}>

      {/* ═══ LEFT SIDEBAR ═══ */}
      <div style={{ width: 220, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'rgba(8,11,20,0.7)', backdropFilter: 'blur(20px)', flexShrink: 0 }}>
        <div style={{ padding: '24px 18px 18px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', margin: '0 auto 12px', background: agentColor + '18', border: `2px solid ${agentColor}40`, boxShadow: `0 0 24px ${agentColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={24} color={agentColor} />
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{agentName}</div>
          <span className="badge badge-active" style={{ marginTop: 8, display: 'inline-flex' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} /> Online
          </span>
        </div>

        <div style={{ padding: 14, flex: 1, overflowY: 'auto' }}>
          <div className="section-label">Connectors</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <ConnectorRow icon={GitBranch} name="GitHub"   connected />
            <ConnectorRow icon={Database}  name="Supabase" connected />
            <ConnectorRow icon={Zap}       name="OpenRouter" connected />
            <ConnectorRow icon={Cpu}       name="HuggingFace" connected />
          </div>
        </div>

        <div style={{ padding: 14, borderTop: '1px solid var(--border)' }}>
          <button onClick={onBack} className="btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: '0.78rem' }}>
            <ArrowLeft size={13} /> Back to Hub
          </button>
        </div>
      </div>

      {/* ═══ CENTER CHAT ═══ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Header */}
        <div style={{ height: 56, padding: '0 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(8,11,20,0.6)', backdropFilter: 'blur(12px)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{agentName}</span>
            {routingState === 'done' && routingResult && (
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                {routingResult.model.emoji} {routingResult.model.displayName}
              </span>
            )}
          </div>
          <button className="btn-ghost" style={{ fontSize: '0.72rem', padding: '5px 10px' }}
            onClick={() => { setMessages([{ role: 'assistant', content: 'New session started! How can I help you today?' }]); setSessionId(null); setRoutingState('idle'); setRoutingResult(null); }}>
            New Session +
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 10, alignItems: 'flex-end' }}>
              {msg.role === 'assistant' && (
                <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: agentColor + '18', border: `1px solid ${agentColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={14} color={agentColor} />
                </div>
              )}

              <div style={{ maxWidth: msg.role === 'user' ? 540 : 700 }}>
                {/* Image previews in user bubble */}
                {msg.role === 'user' && msg.previewUrls && msg.previewUrls.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, justifyContent: 'flex-end' }}>
                    {msg.previewUrls.map((url, pi) => (
                      <img key={pi} src={url} alt="attachment" style={{ maxHeight: 200, maxWidth: 300, borderRadius: 12, border: `2px solid ${agentColor}40`, objectFit: 'cover', boxShadow: `0 4px 20px ${agentColor}20` }} />
                    ))}
                  </div>
                )}

                {(getTextContent(msg) || msg.role === 'assistant') && (
                  <div style={{ padding: '11px 16px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px', background: msg.role === 'user' ? `linear-gradient(135deg, ${agentColor}, var(--indigo))` : 'rgba(13,18,38,0.85)', border: msg.role === 'user' ? 'none' : '1px solid var(--border)', backdropFilter: 'blur(12px)', fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.7 }}>
                    {msg.role === 'user' ? getTextContent(msg) : (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>{getTextContent(msg)}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                )}

                {/* Model watermark on assistant messages */}
                {msg.role === 'assistant' && msg.modelUsed && (
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 4, marginLeft: 4 }}>
                    via {msg.modelUsed}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isStreaming && !messages[messages.length - 1]?.content && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: agentColor + '18', border: `1px solid ${agentColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={14} color={agentColor} />
              </div>
              <div style={{ padding: '12px 16px', borderRadius: '4px 16px 16px 16px', background: 'rgba(13,18,38,0.85)', border: '1px solid var(--border)' }}>
                <div className="typing-wave"><span /><span /><span /></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ═══ INPUT BAR ═══ */}
        <div style={{ padding: '12px 24px 16px', borderTop: '1px solid var(--border)', background: 'rgba(8,11,20,0.75)', backdropFilter: 'blur(12px)', flexShrink: 0 }}>

          {/* Attached file chips */}
          {attachedFiles.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {attachedFiles.map((file, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(99,102,241,0.1)', border: '1px solid var(--border)', borderRadius: 20, padding: '4px 6px 4px 4px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {attachedPreviews[idx] ? (
                    <img src={attachedPreviews[idx]} alt={file.name} style={{ width: 26, height: 26, borderRadius: 14, objectFit: 'cover', border: '1px solid var(--border)' }} />
                  ) : (
                    <div style={{ width: 26, height: 26, borderRadius: 14, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={13} color="var(--text-muted)" />
                    </div>
                  )}
                  <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                  {/* ✕ Remove button */}
                  <button onClick={() => removeFile(idx)} title="Remove file"
                    style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '50%', cursor: 'pointer', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.35)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}>
                    <X size={10} color="var(--red)" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Spell suggestion */}
          {spellSuggestion && (
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="spell-suggestion" onClick={applySpellCorrection} title="Click or press Tab to accept">
                ✏️ Did you mean: <span className="spell-suggestion-key">{spellSuggestion.suggestion}</span>? (Tab)
              </button>
              <button onClick={() => setSpellSuggestion(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.65rem' }}>Dismiss</button>
            </div>
          )}

          {/* Main input row */}
          <div className="chat-input-wrap">
            <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 10, gap: 2 }}>
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept="image/*,text/*,.pdf,.csv,.json,.md" multiple />
              <button onClick={() => fileInputRef.current?.click()} title="Attach file"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: attachedFiles.length > 0 ? agentColor : 'var(--text-muted)', padding: 6, borderRadius: 7, display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}>
                <Paperclip size={17} />
              </button>
              <button onClick={() => fileInputRef.current?.click()} title="Attach image"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6, borderRadius: 7, display: 'flex', alignItems: 'center' }}>
                <ImageIcon size={17} />
              </button>
            </div>

            <input
              className="chat-input"
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={attachedFiles.length > 0 ? `Ask about the attached file…` : `Message ${agentName}…`}
              disabled={isStreaming}
              spellCheck
              autoComplete="off"
            />

            <div style={{ paddingRight: 8 }}>
              <button onClick={handleSend} disabled={(!input.trim() && attachedFiles.length === 0) || isStreaming} className="btn-primary" style={{ padding: '8px 11px' }}>
                <Send size={14} />
              </button>
            </div>
          </div>

          <div style={{ marginTop: 6, textAlign: 'center', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
            Auto-routes to the best free model · Tab to accept spell suggestion
          </div>
        </div>
      </div>

      {/* ═══ RIGHT SIDEBAR — Model Routing Panel ═══ */}
      <div style={{ width: 250, borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'rgba(8,11,20,0.75)', backdropFilter: 'blur(20px)', flexShrink: 0 }}>

        <div style={{ padding: '18px 16px', borderBottom: '1px solid var(--border)' }}>
          <div className="section-label" style={{ marginBottom: 12 }}>🤖 Model Router</div>

          {/* Idle state */}
          {routingState === 'idle' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔌</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Send a message to see the AI router pick the best model for your task.
              </div>
            </div>
          )}

          {/* Analyzing state */}
          {routingState === 'analyzing' && (
            <div>
              <div className="routing-analyzing" style={{ marginBottom: 10 }}>
                <div className="routing-spinner" />
                Choosing best model…
              </div>
              <div style={{ paddingLeft: 4 }}>
                {routingSignals.map((s, i) => (
                  <div key={i} className="routing-signal">{s}</div>
                ))}
              </div>
            </div>
          )}

          {/* Done — show selected model */}
          {routingState === 'done' && routingResult && (
            <div className="routing-result">
              <div style={{ fontSize: '0.68rem', color: 'var(--green)', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={11} /> Model Selected
              </div>

              <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 12px' }}>
                <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{routingResult.model.emoji}</div>
                <div className="routing-model-name">{routingResult.model.displayName}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
                  {routingResult.model.tagline}
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  <span className={`routing-badge routing-badge-${routingResult.model.speed}`}>
                    {routingResult.model.speed === 'fast' ? '⚡' : routingResult.model.speed === 'medium' ? '🔄' : '🧠'} {routingResult.model.speed}
                  </span>
                  <span className="routing-badge routing-badge-medium">
                    📐 {routingResult.model.contextWindow}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Why this model</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{routingResult.model.reason}</div>
              </div>

              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={10} color="var(--text-muted)" />
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Routed in {routingResult.durationMs}ms</span>
              </div>
            </div>
          )}
        </div>

        {/* Available models catalog */}
        <div style={{ padding: '14px 16px', flex: 1, overflowY: 'auto' }}>
          <div className="section-label">Available Models</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.values(MODEL_CATALOG).map(m => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8,
                background: routingResult?.model.id === m.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                border: `1px solid ${routingResult?.model.id === m.id ? 'var(--border-bright)' : 'transparent'}`,
                transition: 'all 0.2s',
              }}>
                <span style={{ fontSize: '1rem' }}>{m.emoji}</span>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: routingResult?.model.id === m.id ? 'var(--cyan)' : 'var(--text-secondary)' }}>{m.displayName}</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{m.taskType}</div>
                </div>
                {routingResult?.model.id === m.id && (
                  <CheckCircle2 size={12} color="var(--cyan)" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Small helpers ── */
function ConnectorRow({ icon: Icon, name, connected }: { icon: React.ElementType; name: string; connected?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
        <Icon size={12} />{name}
      </div>
      {connected
        ? <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 5px var(--green)' }} />
        : <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>+</button>
      }
    </div>
  );
}
