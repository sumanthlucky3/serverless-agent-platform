import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Bot, Code2, BarChart, Paperclip, Link as LinkIcon, Send, ArrowLeft, MoreHorizontal, GitBranch, Database, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../lib/supabase';
import { streamChat } from '../lib/llm';

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  status: string;
  run_count: number;
}

export function Agents() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAgents() {
      const { data, error } = await supabase.from('agents').select('*').order('created_at', { ascending: true });
      if (data) setAgents(data);
      setLoading(false);
    }
    fetchAgents();
  }, []);

  if (agentId) {
    return <AgentWorkspace agentId={agentId} onBack={() => navigate('/agents')} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Agent Hub</h1>
        <p className="text-text-secondary mt-1">Select an agent to assign your next task.</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="w-6 h-6 border-2 border-accent-blue border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {agents.map((agent) => {
          let IconComponent = Bot;
          if (agent.icon === 'file-text') IconComponent = FileText;
          if (agent.icon === 'briefcase') IconComponent = BarChart;
          
          const isActive = agent.status === 'active';

          return (
            <div 
              key={agent.id}
              className={`bg-background-card border border-border rounded-lg p-6 flex flex-col transition-all ${
                isActive ? `hover:border-[${agent.color}] hover:shadow-lg group` : 'opacity-75'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${agent.color}1A` }} // 1A is ~10% opacity
                >
                  <IconComponent className="w-6 h-6" style={{ color: agent.color }} />
                </div>
                
                {isActive ? (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent-green bg-opacity-10 border border-accent-green border-opacity-20 text-[10px] font-bold text-accent-green uppercase tracking-wider">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-green"></div>
                    Active
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-text-muted bg-opacity-20 border border-text-muted border-opacity-20 text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    <div className="w-1.5 h-1.5 rounded-full bg-text-muted"></div>
                    Coming Soon
                  </div>
                )}
              </div>
              
              <h2 className="text-lg font-bold text-text-primary mb-2 transition-colors" style={isActive ? { /* hover handled by group in css usually, let's keep it simple */ } : {}}>
                {agent.name}
              </h2>
              
              <p className="text-sm text-text-secondary flex-1 mb-6 leading-relaxed">
                {agent.description}
              </p>
              
              <div className="flex items-center justify-between mt-auto">
                <span className="text-xs text-text-muted font-medium">{agent.run_count} runs</span>
                {isActive ? (
                  <button 
                    onClick={() => navigate(`/agents/${agent.id}`)}
                    className="bg-accent-blue hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2"
                  >
                    Run Agent &rarr;
                  </button>
                ) : (
                  <button className="bg-background-secondary text-text-primary border border-border px-4 py-2 rounded-md text-sm font-semibold hover:bg-border transition-colors">
                    Notify Me
                  </button>
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

function AgentWorkspace({ agentId, onBack }: { agentId: string, onBack: () => void }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: string, content: string}[]>([
    { role: 'assistant', content: 'Hello! I am ready to help. What would you like to work on?' }
  ]);
  const [agentName, setAgentName] = useState('General Assistant');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadWorkspace() {
      // Fetch agent name
      const { data: agentData } = await supabase.from('agents').select('name').eq('id', agentId).single();
      if (agentData) setAgentName(agentData.name);

      // Fetch recent session
      const { data: sessions } = await supabase
        .from('agent_sessions')
        .select('id')
        .eq('agent_id', agentId)
        .order('started_at', { ascending: false })
        .limit(1);

      if (sessions && sessions.length > 0) {
        const sid = sessions[0].id;
        setSessionId(sid);
        
        // Fetch messages for this session
        const { data: msgs } = await supabase
          .from('agent_messages')
          .select('role, content')
          .eq('session_id', sid)
          .order('created_at', { ascending: true });
          
        if (msgs && msgs.length > 0) {
          setMessages(msgs);
        }
      }
    }
    loadWorkspace();
  }, [agentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    
    const userMsg = input.trim();
    setInput('');
    const currentMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(currentMessages);
    
    setIsTyping(true);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    
    let currentSessionId = sessionId;
    
    try {
      // Create session if it doesn't exist
      if (!currentSessionId) {
        const { data: newSession, error: sessionErr } = await supabase
          .from('agent_sessions')
          .insert({ agent_id: agentId, title: 'New Conversation', status: 'active' })
          .select('id')
          .single();
          
        if (sessionErr) {
          console.error("Supabase Error (Create Session):", sessionErr);
        }
          
        if (newSession) {
          currentSessionId = newSession.id;
          setSessionId(currentSessionId);
        }
      }

      // Save user message
      if (currentSessionId) {
        const { error: msgErr } = await supabase.from('agent_messages').insert({
          session_id: currentSessionId,
          role: 'user',
          content: userMsg
        });
        if (msgErr) console.error("Supabase Error (Insert User Msg):", msgErr);
      }

      // Stream the response directly from LLM API
      const stream = streamChat(currentMessages);
      setIsTyping(false); // Hide typing bubbles once we start streaming
      
      let fullResponse = '';
      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].content = fullResponse;
          return updated;
        });
      }
      
      // Save assistant message
      if (currentSessionId) {
        const { error: astErr } = await supabase.from('agent_messages').insert({
          session_id: currentSessionId,
          role: 'assistant',
          content: fullResponse
        });
        if (astErr) console.error("Supabase Error (Insert Assistant Msg):", astErr);
      }
    } catch (err: any) {
      setIsTyping(false);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1].content = `**Error:** ${err.message}`;
        return updated;
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  return (
    <div className="fixed inset-0 bg-background-primary z-50 flex animate-in fade-in duration-300">
      
      {/* LEFT SIDEBAR - AGENT INFO */}
      <div className="w-64 border-r border-border bg-background-secondary flex flex-col">
        <div className="p-6 border-b border-border flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-accent-blue bg-opacity-10 flex items-center justify-center mb-4 border border-accent-blue border-opacity-20">
            <Bot className="w-10 h-10 text-accent-blue" />
          </div>
          <h2 className="font-bold text-lg text-text-primary">{agentName}</h2>
          <div className="flex items-center gap-1.5 mt-2">
            <div className="w-2 h-2 rounded-full bg-accent-green"></div>
            <span className="text-xs font-semibold text-accent-green tracking-wide uppercase">Active</span>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Connectors</h3>
          <div className="space-y-2 mb-8">
            <ConnectorItem icon={GitBranch} name="GitHub" connected />
            <ConnectorItem icon={Database} name="Supabase" connected />
            <ConnectorItem icon={MoreHorizontal} name="Groq API" connected />
            <ConnectorItem icon={MoreHorizontal} name="Notion" />
            <ConnectorItem icon={MoreHorizontal} name="Google Drive" />
            <ConnectorItem icon={MoreHorizontal} name="Slack" />
          </div>

          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Recent Sessions</h3>
          <div className="space-y-1">
            <SessionItem title="FastAPI Authentication" time="2 hours ago" />
            <SessionItem title="Supabase Schema Design" time="Yesterday" />
            <SessionItem title="React Native Setup" time="Oct 24, 2025" />
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm font-medium w-full"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Agent Hub
          </button>
        </div>
      </div>

      {/* CENTER - CHAT AREA */}
      <div className="flex-1 flex flex-col bg-[#0D1117] relative">
        <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-background-primary shrink-0">
          <h2 className="font-semibold text-text-primary">{agentName}</h2>
          <button className="bg-background-secondary border border-border text-text-primary px-3 py-1.5 rounded-md text-sm font-medium hover:bg-border transition-colors">
            New Session +
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'gap-4 max-w-3xl'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-accent-blue bg-opacity-20 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-accent-blue" />
                </div>
              )}
              <div className={`${
                msg.role === 'user' 
                  ? 'bg-accent-blue text-white px-5 py-3 rounded-2xl rounded-tr-sm max-w-xl text-sm shadow-sm'
                  : 'bg-background-card border border-border px-5 py-4 rounded-2xl rounded-tl-sm text-sm text-text-primary flex-1 shadow-sm leading-relaxed overflow-hidden'
              }`}>
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <div className="prose prose-invert max-w-none text-sm prose-p:leading-relaxed prose-pre:bg-[#0D1117] prose-pre:border prose-pre:border-border">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
             <div className="flex gap-4 max-w-3xl">
                <div className="w-8 h-8 rounded-full bg-accent-blue bg-opacity-20 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-accent-blue" />
                </div>
                <div className="bg-background-card border border-border px-5 py-4 rounded-2xl rounded-tl-sm text-sm text-text-primary shadow-sm flex gap-1 items-center h-[52px]">
                   <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce"></div>
                   <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                   <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT BAR */}
        <div className="p-6 bg-background-primary border-t border-border shrink-0">
          <div className="max-w-4xl mx-auto">
            <div className="relative flex items-center bg-background-card border border-border rounded-xl focus-within:border-text-muted transition-colors shadow-sm">
              <div className="flex items-center px-3 gap-1">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-background-secondary" title="Attach file">
                  <Paperclip className="w-5 h-5" />
                </button>
                <button className="p-2 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-background-secondary" title="Add reference link">
                  <LinkIcon className="w-5 h-5" />
                </button>
              </div>
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${agentName}...`}
                className="flex-1 bg-transparent py-4 outline-none text-sm text-text-primary placeholder:text-text-muted"
                disabled={isTyping}
              />
              <div className="px-3">
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="bg-accent-blue text-white p-2.5 rounded-lg hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex gap-2 mt-3 ml-2">
              <span className="text-[11px] font-medium text-text-muted bg-background-card px-2 py-1 rounded-md border border-border">GitHub connected</span>
              <span className="text-[11px] font-medium text-text-muted bg-background-card px-2 py-1 rounded-md border border-border">Supabase connected</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR - CONTEXT */}
      <div className="w-72 border-l border-border bg-background-primary flex flex-col text-sm">
        <div className="p-5 border-b border-border">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Attached Files</h3>
          {attachedFiles.length === 0 ? (
             <div className="text-sm text-text-muted mb-3 italic">No files attached.</div>
          ) : (
            attachedFiles.map((file, idx) => (
              <div key={idx} className="bg-background-secondary border border-dashed border-border rounded-lg p-3 flex items-center justify-between group hover:border-text-muted transition-colors mb-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 bg-background-card rounded flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-text-secondary" />
                  </div>
                  <span className="truncate text-text-secondary text-sm font-medium">{file.name}</span>
                </div>
                <button onClick={() => removeFile(idx)} className="text-text-muted hover:text-accent-red opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
              </div>
            ))
          )}
          <button onClick={() => fileInputRef.current?.click()} className="text-text-secondary hover:text-text-primary font-medium text-sm w-full text-center py-2 transition-colors">
            + Add File
          </button>
        </div>

        <div className="p-5 border-b border-border">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Agent Memory</h3>
          <div className="flex flex-wrap gap-2">
            <span className="bg-background-card border border-border px-2.5 py-1 rounded-md text-xs font-medium text-text-primary">Python developer</span>
            <span className="bg-background-card border border-border px-2.5 py-1 rounded-md text-xs font-medium text-text-primary">Prefers FastAPI</span>
          </div>
          <button className="text-accent-blue text-xs font-medium mt-4 hover:underline">Edit Memory</button>
        </div>

        <div className="p-5">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">This Session</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-text-secondary">Duration</span>
              <span className="text-text-primary font-medium">5 min ago</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Messages</span>
              <span className="text-text-primary font-medium">3</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Model</span>
              <span className="text-text-primary font-medium">Gemini 3.1 Pro</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

// Subcomponents for Sidebar
function ConnectorItem({ icon: Icon, name, connected }: { icon: any, name: string, connected?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm group">
      <div className="flex items-center gap-2 text-text-secondary">
        <Icon className="w-4 h-4" />
        {name}
      </div>
      {connected ? (
        <div className="w-2 h-2 rounded-full bg-accent-green"></div>
      ) : (
        <button className="text-[10px] font-bold text-text-muted group-hover:text-text-primary uppercase tracking-wider transition-colors">
          + Connect
        </button>
      )}
    </div>
  );
}

function SessionItem({ title, time }: { title: string, time: string }) {
  return (
    <div className="py-2 cursor-pointer group">
      <div className="text-sm font-medium text-text-secondary group-hover:text-text-primary truncate transition-colors">
        {title}
      </div>
      <div className="text-xs text-text-muted mt-0.5">{time}</div>
    </div>
  );
}
