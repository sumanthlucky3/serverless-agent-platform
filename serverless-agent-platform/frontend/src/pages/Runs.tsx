import React, { useState, useEffect } from 'react';
import { Search, Filter, MoreVertical, CheckCircle2, Activity, XCircle, Bot, FileText, Briefcase, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Runs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('All');
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRuns() {
      const { data: sessions, error } = await supabase
        .from('agent_sessions')
        .select('*, agents(name)')
        .order('started_at', { ascending: false });
        
      if (sessions) {
        setRuns(sessions.map(s => ({
          id: '#' + s.id.toString().padStart(3, '0'),
          task: s.title || 'New Conversation',
          agent: s.agents?.name || 'Unknown Agent',
          icon: Bot,
          duration: '1.2s', 
          status: s.status === 'active' ? 'RUNNING' : 'DONE',
          date: new Date(s.started_at).toLocaleDateString() + ' ' + new Date(s.started_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        })));
      }
      setLoading(false);
    }
    fetchRuns();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">All Runs</h1>
          <p className="text-sm text-text-secondary mt-1">View and filter historical agent execution logs.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-background-card border border-border rounded-md py-2 pl-9 pr-4 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors w-full sm:w-64 placeholder:text-text-muted"
            />
          </div>
          
          <button className="flex items-center gap-2 bg-background-card border border-border rounded-md py-2 px-4 text-sm font-medium text-text-primary hover:border-text-muted transition-colors">
            <Filter className="w-4 h-4 text-text-muted" />
            {filter}
          </button>
        </div>
      </div>

      {/* Runs Data Table */}
      <div className="bg-background-card border border-border rounded-lg shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] text-text-muted font-bold uppercase tracking-wider border-b border-border bg-[#161B22]">
              <tr>
                <th className="px-5 py-4 font-semibold">Run ID</th>
                <th className="px-5 py-4 font-semibold">Task Description</th>
                <th className="px-5 py-4 font-semibold">Agent</th>
                <th className="px-5 py-4 font-semibold">Duration</th>
                <th className="px-5 py-4 font-semibold">Date</th>
                <th className="px-5 py-4 font-semibold text-right">Status</th>
                <th className="px-5 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-text-muted">Loading runs...</td>
                </tr>
              ) : runs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-text-muted">No runs found.</td>
                </tr>
              ) : runs.map((run, i) => (
                <tr key={i} className="hover:bg-background-secondary transition-colors group">
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="font-mono text-text-muted">{run.id}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-medium text-text-primary">{run.task}</span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <run.icon className="w-4 h-4 text-text-muted" />
                      <span className="text-text-secondary">{run.agent}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="text-text-secondary">{run.duration}</span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="text-text-secondary">{run.date}</span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-right">
                    {run.status === 'DONE' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-green bg-opacity-10 border border-accent-green border-opacity-20 text-accent-green text-xs font-semibold tracking-wide">
                        <CheckCircle2 className="w-3 h-3" /> DONE
                      </span>
                    )}
                    {run.status === 'RUNNING' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-blue bg-opacity-10 border border-accent-blue border-opacity-20 text-accent-blue text-xs font-semibold tracking-wide">
                        <Activity className="w-3 h-3" /> RUNNING
                      </span>
                    )}
                    {run.status === 'FAILED' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-red bg-opacity-10 border border-accent-red border-opacity-20 text-accent-red text-xs font-semibold tracking-wide">
                        <XCircle className="w-3 h-3" /> FAILED
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-text-muted hover:text-text-primary rounded hover:bg-background-card transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-text-muted hover:text-text-primary rounded hover:bg-background-card transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between bg-background-card">
          <span className="text-xs text-text-muted">Showing 1 to 9 of 247 runs</span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-xs font-medium text-text-muted bg-background-secondary border border-border rounded hover:text-text-primary transition-colors disabled:opacity-50" disabled>
              Previous
            </button>
            <button className="px-3 py-1.5 text-xs font-medium text-text-primary bg-background-secondary border border-border rounded hover:text-text-primary transition-colors">
              Next
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'DONE') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-accent-green bg-opacity-10 text-accent-green border border-accent-green border-opacity-20 text-[10px] font-bold uppercase tracking-wider">
        <CheckCircle2 className="w-3 h-3" /> DONE
      </span>
    );
  }
  if (status === 'RUNNING') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-accent-amber bg-opacity-10 text-accent-amber border border-accent-amber border-opacity-20 text-[10px] font-bold uppercase tracking-wider">
        <Activity className="w-3 h-3 animate-pulse" /> RUNNING
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-accent-red bg-opacity-10 text-accent-red border border-accent-red border-opacity-20 text-[10px] font-bold uppercase tracking-wider">
      <XCircle className="w-3 h-3" /> FAILED
    </span>
  );
}
