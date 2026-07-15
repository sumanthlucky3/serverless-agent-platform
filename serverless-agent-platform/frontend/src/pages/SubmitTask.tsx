import React, { useState } from 'react';
import { Send, Paperclip, Bot, FileText, Briefcase, ChevronDown } from 'lucide-react';

export function SubmitTask() {
  const [taskText, setTaskText] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('auto');
  const [priority, setPriority] = useState('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setTaskText('');
    }, 1500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Submit Task</h1>
        <p className="text-sm text-text-secondary mt-1">Dispatch a new task to your autonomous agents.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-background-card border border-border rounded-lg shadow-sm p-6 space-y-6">
        
        {/* Task Description */}
        <div className="space-y-2">
          <label htmlFor="task" className="block text-sm font-semibold text-text-primary">
            Task Description <span className="text-accent-red">*</span>
          </label>
          <textarea
            id="task"
            rows={4}
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            placeholder="E.g., Generate a Q3 performance report PDF based on the attached CSV data..."
            className="w-full bg-[#161B22] border border-border rounded-md p-4 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors placeholder:text-text-muted resize-none"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Agent Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-text-primary">Target Agent</label>
            <div className="relative">
              <select 
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="w-full bg-[#161B22] border border-border rounded-md py-2.5 pl-4 pr-10 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors appearance-none cursor-pointer"
              >
                <option value="auto">Auto-route (Let Platform Decide)</option>
                <option value="general">🤖 General Assistant</option>
                <option value="docs">📄 Docs & Reports</option>
                <option value="jobs">💼 Job Application Agent</option>
              </select>
              <ChevronDown className="w-4 h-4 text-text-muted absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-text-primary">Priority</label>
            <div className="relative">
              <select 
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-[#161B22] border border-border rounded-md py-2.5 pl-4 pr-10 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors appearance-none cursor-pointer"
              >
                <option value="low">Low (Background Queue)</option>
                <option value="normal">Normal</option>
                <option value="high">High (Immediate Execution)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-text-muted absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* File Attachment */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-text-primary">Attachments (Optional)</label>
          <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-background-secondary hover:border-text-muted transition-colors cursor-pointer group">
            <div className="w-10 h-10 rounded-full bg-background-secondary border border-border flex items-center justify-center mb-3 group-hover:bg-[#161B22] transition-colors">
              <Paperclip className="w-5 h-5 text-text-muted group-hover:text-accent-blue transition-colors" />
            </div>
            <p className="text-sm font-medium text-text-primary mb-1">Click to upload or drag and drop</p>
            <p className="text-xs text-text-muted">PDF, DOCX, CSV, TXT (max. 10MB)</p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-border flex items-center justify-end">
          <button 
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
