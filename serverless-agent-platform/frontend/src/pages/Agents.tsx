import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Bot, Paperclip, Send, ArrowLeft, GitBranch, Database,
  FileText, BarChart2, Zap, Image as ImageIcon, X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../lib/supabase';
import { streamChat, buildVisionContent, type ChatMessage, type ContentPart } from '../lib/llm';

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  status: string;
  run_count: number;
}

// A message as stored in UI — content can be string OR parts array (for images)
interface UIMessage {
  role: 'user' | 'assistant';
  content: string | ContentPart[];
  /** pre-built object URLs for image thumbnails so we can revoke them later */
  previewUrls?: string[];
}

const ICON_MAP: Record<string, any> = {
  'bot':       Bot,
  'file-text': FileText,
  'briefcase': BarChart2,
};

/* =============================================
   AGENT HUB — card grid
   ============================================= */
export function Agents() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setAgents(data); setLoading(false); });
  }, []);

  if (agentId) {
    return <AgentWorkspace agentId={agentId} onBack={() => navigate('/agents')} />;
  }

  return (
    <div className="page-enter" style={{ paddingBottom: 32 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">
          Agent <span className="gradient-text">Hub</span>
        </h1>
        <p className="page-subtitle">Select an agent to begin your next mission.</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
          <div style={{
            width: 36, height: 36, border: '2px solid transparent',
            borderTopColor: 'var(--cyan)', borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div className="agent-grid">
          {agents.map((agent) => {
            const Icon = ICON_MAP[agent.icon] || Bot;
            const isActive = agent.status === 'active';
            const colorGlow = agent.color + '40';
            return (
              <div
                key={agent.id}
                className="glass-card agent-card"
                style={{
                  '--agent-color':      agent.color,
                  '--agent-color-glow': colorGlow,
                  display: 'flex', flexDirection: 'column',
                  opacity: isActive ? 1 : 0.65,
                } as React.CSSProperties}
                onClick={() => isActive && navigate(`/agents/${agent.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                  <div className="agent-icon-wrap" style={{
                    background: agent.color + '18',
                    border: `1px solid ${agent.color}30`,
                    boxShadow: `0 0 16px ${agent.color}20`,
                  }}>
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
                  {isActive ? (
                    <button className="btn-primary" onClick={(e) => { e.stopPropagation(); navigate(`/agents/${agent.id}`); }}>
                      Run Agent <span>→</span>
                    </button>
                  ) : (
                    <button className="btn-ghost">Notify Me</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =============================================
   AGENT WORKSPACE — professional chat UI
   ============================================= */
function AgentWorkspace({ agentId, onBack }: { agentId: string; onBack: () => void }) {
  const [input, setInput]                   = useState('');
  const [messages, setMessages]             = useState<UIMessage[]>([
    { role: 'assistant', content: 'Hello! I\'m ready to help. You can send text, attach images, or ask me anything.' },
  ]);
  const [agentName, setAgentName]           = useState('General Assistant');
  const [agentColor, setAgentColor]         = useState('var(--cyan)');
  const [isTyping, setIsTyping]             = useState(false);
  const [sessionId, setSessionId]           = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles]   = useState<File[]>([]);
  // object-URL previews for attached images (revoke when file is removed)
  const [attachedPreviews, setAttachedPreviews] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const { data: agentData } = await supabase
        .from('agents').select('name, color').eq('id', agentId).single();
      if (agentData) { setAgentName(agentData.name); setAgentColor(agentData.color); }

      const { data: sessions } = await supabase
        .from('agent_sessions').select('id').eq('agent_id', agentId)
        .order('started_at', { ascending: false }).limit(1);

      if (sessions && sessions.length > 0) {
        const sid = sessions[0].id;
        setSessionId(sid);
        const { data: msgs } = await supabase
          .from('agent_messages').select('role, content')
          .eq('session_id', sid).order('created_at', { ascending: true });
        if (msgs && msgs.length > 0) {
          setMessages(msgs.map(m => ({ ...m, role: m.role as 'user' | 'assistant' })));
        }
      }
    }
    load();
    // Revoke object URLs on unmount
    return () => { attachedPreviews.forEach(url => URL.revokeObjectURL(url)); };
  }, [agentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ---------- File handling ---------- */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    const newPreviews = newFiles.map(f =>
      f.type.startsWith('image/') ? URL.createObjectURL(f) : ''
    );
    setAttachedFiles(prev => [...prev, ...newFiles]);
    setAttachedPreviews(prev => [...prev, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (idx: number) => {
    // Revoke the object URL to free memory
    if (attachedPreviews[idx]) URL.revokeObjectURL(attachedPreviews[idx]);
    setAttachedFiles(prev    => prev.filter((_, i) => i !== idx));
    setAttachedPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  /* ---------- Send ---------- */
  const handleSend = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || isTyping) return;

    const textInput    = input.trim();
    const imageFiles   = attachedFiles.filter(f => f.type.startsWith('image/'));
    const previewSnap  = [...attachedPreviews]; // snapshot for bubble rendering

    // Build the UI message for the user bubble
    const userMsg: UIMessage = imageFiles.length > 0
      ? { role: 'user', content: textInput || ' ', previewUrls: previewSnap.filter(Boolean) }
      : { role: 'user', content: textInput };

    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages);
    setInput('');
    setAttachedFiles([]);
    setAttachedPreviews([]);

    setIsTyping(true);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    let currentSessionId = sessionId;

    try {
      if (!currentSessionId) {
        const { data: newSession } = await supabase
          .from('agent_sessions')
          .insert({ agent_id: agentId, title: textInput.slice(0, 60) || 'Image Task', status: 'active' })
          .select('id').single();
        if (newSession) { currentSessionId = newSession.id; setSessionId(currentSessionId); }
      }

      // Persist user message as plain text
      if (currentSessionId) {
        await supabase.from('agent_messages').insert({
          session_id: currentSessionId, role: 'user',
          content: textInput || '[image attached]',
        });
      }

      // Build the API message history — convert images to base64 for vision API
      const apiHistory: ChatMessage[] = await Promise.all(
        currentMessages.map(async (m): Promise<ChatMessage> => {
          // If this is the last user message and we have images, build vision content
          if (m === userMsg && imageFiles.length > 0) {
            const parts = await buildVisionContent(textInput, imageFiles);
            return { role: 'user', content: parts };
          }
          // For older messages or text-only, just pass content as a string
          const textContent = typeof m.content === 'string'
            ? m.content
            : (m.content as ContentPart[]).find(p => p.type === 'text')?.text ?? '';
          return { role: m.role, content: textContent };
        })
      );

      const stream = streamChat(apiHistory);
      setIsTyping(false);
      let fullResponse = '';
      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: fullResponse };
          return updated;
        });
      }

      if (currentSessionId) {
        await supabase.from('agent_messages').insert({
          session_id: currentSessionId, role: 'assistant', content: fullResponse,
        });
      }
    } catch (err: any) {
      setIsTyping(false);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: `**Error:** ${err.message}` };
        return updated;
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  /* ---------- Render ---------- */
  const getTextContent = (msg: UIMessage) =>
    typeof msg.content === 'string'
      ? msg.content
      : (msg.content as ContentPart[]).find(p => p.type === 'text')?.text ?? '';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex',
      background: 'rgba(3,4,10,0.95)',
      backdropFilter: 'blur(24px)',
      animation: 'fadeUp 0.3s ease forwards',
    }}>

      {/* ── LEFT SIDEBAR ── */}
      <div style={{
        width: 230, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        background: 'rgba(8,11,20,0.7)', backdropFilter: 'blur(20px)', flexShrink: 0,
      }}>
        <div style={{ padding: '28px 20px 20px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 12px',
            background: agentColor + '18', border: `2px solid ${agentColor}40`,
            boxShadow: `0 0 24px ${agentColor}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bot size={26} color={agentColor} />
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{agentName}</div>
          <span className="badge badge-active" style={{ marginTop: 8, display: 'inline-flex' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
            Online · Vision
          </span>
        </div>

        <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
          <div className="section-label">Connectors</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            <ConnectorRow icon={GitBranch} name="GitHub"   connected />
            <ConnectorRow icon={Database}  name="Supabase" connected />
            <ConnectorRow icon={Zap}       name="Gemini 2.0" connected />
          </div>
        </div>

        <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
          <button onClick={onBack} className="btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </div>

      {/* ── CENTER CHAT ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Header */}
        <div style={{
          height: 58, padding: '0 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(8,11,20,0.6)', backdropFilter: 'blur(12px)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{agentName}</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>gemini-2.0-flash · vision</span>
          </div>
          <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '6px 12px' }}
            onClick={() => {
              setMessages([{ role: 'assistant', content: 'New session started! How can I help?' }]);
              setSessionId(null);
            }}>
            New Session +
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              gap: 12, alignItems: 'flex-end',
            }}>
              {msg.role === 'assistant' && (
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: agentColor + '18', border: `1px solid ${agentColor}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Bot size={15} color={agentColor} />
                </div>
              )}

              <div style={{ maxWidth: msg.role === 'user' ? 560 : 720 }}>
                {/* Image previews in the user bubble */}
                {msg.role === 'user' && msg.previewUrls && msg.previewUrls.length > 0 && (
                  <div style={{
                    display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8,
                    justifyContent: 'flex-end',
                  }}>
                    {msg.previewUrls.map((url, pi) => (
                      <img
                        key={pi} src={url} alt="attachment"
                        style={{
                          maxHeight: 220, maxWidth: 320, borderRadius: 12,
                          border: `2px solid ${agentColor}40`,
                          objectFit: 'cover',
                          boxShadow: `0 4px 20px ${agentColor}20`,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Message bubble */}
                {(getTextContent(msg) || msg.role === 'assistant') && (
                  <div style={{
                    padding: '12px 18px',
                    borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                    background: msg.role === 'user'
                      ? `linear-gradient(135deg, ${agentColor}, var(--indigo))`
                      : 'rgba(13,18,38,0.85)',
                    border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                    backdropFilter: 'blur(12px)',
                    fontSize: '0.875rem',
                    color: 'var(--text-primary)',
                    lineHeight: 1.7,
                  }}>
                    {msg.role === 'user' ? (
                      getTextContent(msg)
                    ) : (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>{getTextContent(msg)}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: agentColor + '18', border: `1px solid ${agentColor}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Bot size={15} color={agentColor} />
              </div>
              <div style={{
                padding: '14px 18px', borderRadius: '4px 18px 18px 18px',
                background: 'rgba(13,18,38,0.85)', border: '1px solid var(--border)',
              }}>
                <div className="typing-wave"><span /><span /><span /></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── INPUT BAR ── */}
        <div style={{
          padding: '12px 24px 18px',
          borderTop: '1px solid var(--border)',
          background: 'rgba(8,11,20,0.7)',
          backdropFilter: 'blur(12px)',
          flexShrink: 0,
        }}>
          {/* Attached file chips with remove button */}
          {attachedFiles.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {attachedFiles.map((file, idx) => {
                const isImage   = file.type.startsWith('image/');
                const previewUrl = attachedPreviews[idx];
                return (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(99,102,241,0.1)',
                    border: '1px solid var(--border)',
                    borderRadius: 20, padding: '4px 6px 4px 4px',
                    fontSize: '0.75rem', color: 'var(--text-secondary)',
                  }}>
                    {isImage && previewUrl ? (
                      <img src={previewUrl} alt={file.name} style={{
                        width: 26, height: 26, borderRadius: 14,
                        objectFit: 'cover', border: '1px solid var(--border)',
                      }} />
                    ) : (
                      <div style={{
                        width: 26, height: 26, borderRadius: 14,
                        background: 'rgba(99,102,241,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <FileText size={13} color="var(--text-muted)" />
                      </div>
                    )}
                    <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.name}
                    </span>
                    {/* ── REMOVE BUTTON ── */}
                    <button
                      onClick={() => removeFile(idx)}
                      title={`Remove ${file.name}`}
                      style={{
                        background: 'rgba(239,68,68,0.15)',
                        border: '1px solid rgba(239,68,68,0.25)',
                        borderRadius: '50%', cursor: 'pointer',
                        width: 18, height: 18, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        padding: 0, transition: 'background 0.15s',
                        flexShrink: 0,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.35)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
                    >
                      <X size={10} color="var(--red)" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Text input row */}
          <div className="chat-input-wrap">
            <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 12, gap: 4 }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                accept="image/*,text/*,.pdf,.csv,.json,.md"
                multiple
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Attach image or file"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: attachedFiles.length > 0 ? agentColor : 'var(--text-muted)',
                  padding: 6, borderRadius: 7, transition: 'color 0.2s',
                  display: 'flex', alignItems: 'center',
                }}
              >
                <Paperclip size={18} />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Attach image"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: 6, borderRadius: 7,
                  transition: 'color 0.2s', display: 'flex', alignItems: 'center',
                }}
              >
                <ImageIcon size={18} />
              </button>
            </div>

            <input
              className="chat-input"
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                attachedFiles.length > 0
                  ? `Ask about the ${attachedFiles.length > 1 ? 'files' : 'file'}…`
                  : `Message ${agentName}…`
              }
              disabled={isTyping}
            />

            <div style={{ paddingRight: 10 }}>
              <button
                onClick={handleSend}
                disabled={(!input.trim() && attachedFiles.length === 0) || isTyping}
                className="btn-primary"
                style={{ padding: '8px 12px' }}
              >
                <Send size={15} />
              </button>
            </div>
          </div>

          <div style={{ marginTop: 8, textAlign: 'center', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            Powered by Gemini 2.0 Flash (vision) · images are processed locally before sending
          </div>
        </div>
      </div>

      {/* ── RIGHT SIDEBAR ── */}
      <div style={{
        width: 240, borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        background: 'rgba(8,11,20,0.7)', backdropFilter: 'blur(20px)',
        fontSize: '0.825rem', color: 'var(--text-secondary)', flexShrink: 0,
      }}>
        <div style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
          <div className="section-label">Session</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <InfoRow label="Messages" value={String(messages.length)} />
            <InfoRow label="Model"    value="Gemini 2.0 Flash" />
            <InfoRow label="Vision"   value="✓ Enabled" />
          </div>
        </div>

        <div style={{ padding: 20 }}>
          <div className="section-label">Supported Inputs</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['💬 Text messages', '🖼️ Images (jpg, png, webp)', '📄 Documents (pdf, txt)', '🔗 Code files'].map(item => (
              <div key={item} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{item}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Sidebar helpers ---------- */
function ConnectorRow({ icon: Icon, name, connected }: { icon: any; name: string; connected?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
        <Icon size={13} />{name}
      </div>
      {connected
        ? <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)' }} />
        : <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>+ Connect</button>
      }
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.78rem' }}>{value}</span>
    </div>
  );
}
