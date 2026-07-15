import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, ChevronDown, CheckCircle2, AlertCircle, Clock, X, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Agent = { id: string; name: string; };
type SubmissionResult = { success: boolean; sessionId?: string | number; message: string; };

export function SubmitTask() {
  const [taskText, setTaskText] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('auto');
  const [priority, setPriority] = useState('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from('agents').select('id, name').then(({ data }) => {
      if (data && data.length > 0) setAgents(data);
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskText.trim()) return;
    setIsSubmitting(true);
    setResult(null);

    try {
      // 1. Create a new agent session for this task
      const { data: session, error: sessionErr } = await supabase
        .from('agent_sessions')
        .insert({
          agent_id: selectedAgent,
          title: taskText.substring(0, 80),
          status: priority === 'high' ? 'active' : 'pending',
        })
        .select('id')
        .single();

      if (sessionErr) throw sessionErr;

      // 2. Upload files to Supabase Storage (if any)
      const uploadedUrls: string[] = [];
      if (files.length > 0) {
        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${session.id}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
          const filePath = `uploads/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('agent-files')
            .upload(filePath, file);
            
          if (!uploadError) {
            const { data } = supabase.storage.from('agent-files').getPublicUrl(filePath);
            uploadedUrls.push(data.publicUrl);
          }
        }
      }

      // 3. Log the task as the first message in the session
      let attachmentsMarkdown = '';
      if (uploadedUrls.length > 0) {
        attachmentsMarkdown = `\n\n**Attachments:**\n${uploadedUrls.map((url, i) => `${i + 1}. [Attached File](${url})`).join('\n')}`;
      }
      
      await supabase.from('agent_messages').insert({
        session_id: session.id,
        role: 'user',
        content: `**Task Submitted:** ${taskText}\n\n**Priority:** ${priority}${attachmentsMarkdown}`,
      });

      // 4. Trigger the GitHub Actions workflow to actually run the agent
      await fetch('https://api.github.com/repos/sumanthlucky3/serverless-agent-platform/dispatches', {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: 'run-agent-task',
          client_payload: {
            session_id: String(session.id),
            agent_id: selectedAgent,
            task: taskText,
            image_urls: uploadedUrls // Pass image URLs directly for the router
          }
        })
      });


      setResult({ success: true, sessionId: session.id, message: `Task dispatched! Session #${session.id} is queued — your agent is starting up on GitHub Actions.` });
      setTaskText('');
      setFiles([]);
    } catch (err: any) {
      setResult({ success: false, message: `Failed to dispatch: ${err?.message || 'Unknown error'}` });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Submit Task</h1>
        <p className="text-sm text-text-secondary mt-1">Dispatch a new task to your autonomous agents. It will be logged and tracked in Runs.</p>
      </div>

      {result && (
        <div className={`flex items-start gap-3 p-4 rounded-lg border text-sm animate-in fade-in duration-200 ${
          result.success 
            ? 'bg-accent-green bg-opacity-10 border-accent-green border-opacity-30 text-accent-green'
            : 'bg-accent-red bg-opacity-10 border-accent-red border-opacity-30 text-accent-red'
        }`}>
          {result.success ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
          <div>
            <p className="font-semibold">{result.success ? 'Task Dispatched!' : 'Dispatch Failed'}</p>
            <p className="opacity-80 mt-0.5">{result.message}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-background-card border border-border rounded-lg shadow-sm p-6 space-y-6">
        
        {/* Task Description */}
        <div className="space-y-2">
          <label htmlFor="task-input" className="block text-sm font-semibold text-text-primary">
            Task Description <span className="text-accent-red">*</span>
          </label>
          <textarea
            id="task-input"
            rows={5}
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            placeholder="E.g., Analyze the attached CSV and generate a Q3 performance summary PDF..."
            className="w-full bg-[#161B22] border border-border rounded-md p-4 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors placeholder:text-text-muted resize-none"
            required
          />
          <p className="text-xs text-text-muted text-right">{taskText.length} characters</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Agent Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-text-primary">Target Agent</label>
            <div className="relative">
              <select 
                id="agent-select"
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="w-full bg-[#161B22] border border-border rounded-md py-2.5 pl-4 pr-10 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors appearance-none cursor-pointer"
              >
                {agents.length > 0 ? (
                  agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)
                ) : (
                  <>
                    <option value="auto">🧠 Smart Router (Auto)</option>
                    <option value="agent_docs">📄 Docs & Reports Agent</option>
                    <option value="agent_jobs">💼 Job Application Agent</option>
                  </>
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-text-muted absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-text-primary">Priority</label>
            <div className="relative">
              <select 
                id="priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-[#161B22] border border-border rounded-md py-2.5 pl-4 pr-10 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors appearance-none cursor-pointer"
              >
                <option value="low">🟡 Low (Background Queue)</option>
                <option value="normal">🔵 Normal</option>
                <option value="high">🔴 High (Immediate)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-text-muted absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* File Attachment */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-text-primary">Attachments (Optional)</label>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
          
          {files.length > 0 && (
            <div className="space-y-2 mb-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 bg-background-secondary border border-border rounded-md px-3 py-2 text-sm">
                  <FileText className="w-4 h-4 text-text-muted shrink-0" />
                  <span className="text-text-primary truncate flex-1">{f.name}</span>
                  <span className="text-text-muted text-xs shrink-0">{(f.size / 1024).toFixed(1)} KB</span>
                  <button type="button" onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-text-muted hover:text-accent-red transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-background-secondary hover:border-accent-blue transition-colors cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-background-secondary border border-border flex items-center justify-center mb-3 group-hover:bg-[#161B22] transition-colors">
              <Paperclip className="w-5 h-5 text-text-muted group-hover:text-accent-blue transition-colors" />
            </div>
            <p className="text-sm font-medium text-text-primary mb-1">Click to upload or drag and drop</p>
            <p className="text-xs text-text-muted">PDF, DOCX, CSV, TXT (max. 10MB)</p>
          </div>
        </div>

        {/* Priority Info */}
        <div className="flex items-center gap-2 text-xs text-text-muted bg-background-secondary border border-border rounded-md px-3 py-2">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>Tasks are logged to Supabase and visible in the <strong className="text-text-primary">Runs</strong> tab. Your agents will pick them up from the queue.</span>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-border flex items-center justify-between">
          <span className="text-xs text-text-muted">{files.length > 0 ? `${files.length} file(s) attached` : 'No attachments'}</span>
          <button 
            id="submit-task-btn"
            type="submit" 
            disabled={!taskText.trim() || isSubmitting}
            className="bg-accent-blue hover:bg-blue-600 text-white text-sm font-semibold py-2.5 px-6 rounded-md transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Dispatching...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Dispatch Task
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
