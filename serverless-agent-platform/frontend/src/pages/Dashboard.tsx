import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle2, Clock, Bot, XCircle, Database, Zap, GitBranch, MoreHorizontal } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../lib/supabase';

// Dummy data for charts
const timelineData = [
  { day: '14d ago', success: 40, errors: 2 },
  { day: '12d ago', success: 45, errors: 3 },
  { day: '10d ago', success: 42, errors: 1 },
  { day: '8d ago', success: 55, errors: 4 },
  { day: '6d ago', success: 48, errors: 0 },
  { day: '4d ago', success: 65, errors: 2 },
  { day: '2d ago', success: 75, errors: 1 },
  { day: 'Today', success: 85, errors: 2 },
];

const distributionData = [
  { name: 'General Assistant', value: 192, color: '#0663C1' },
  { name: 'Docs & Reports', value: 45, color: '#7C3AED' },
  { name: 'Job Application', value: 10, color: '#D97F06' },
];

const recentRuns = [
  { id: '#247', task: 'Write Python API for user auth', agent: 'Gemini 1.5', duration: '2.4s', status: 'DONE' },
  { id: '#246', task: 'Optimize React dashboard render', agent: 'Groq Llama', duration: '0.8s', status: 'DONE' },
  { id: '#245', task: 'Process 10GB log file anomalies', agent: 'HF Mixtral', duration: '45s', status: 'RUNNING' },
  { id: '#244', task: 'Scrape competitor pricing page', agent: 'Gemini Pro', duration: '12.1s', status: 'FAILED' },
  { id: '#243', task: 'Generate SQL schema for billing', agent: 'HF Coder', duration: '3.2s', status: 'DONE' },
];

export function Dashboard() {
  const [metrics, setMetrics] = useState({
    totalRuns: 0,
    activeAgents: 0,
    loading: true
  });

  useEffect(() => {
    async function fetchMetrics() {
      // Get total runs
      const { count: sessionsCount } = await supabase
        .from('agent_sessions')
        .select('*', { count: 'exact', head: true });
        
      // Get active agents
      const { count: agentsCount } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
        
      setMetrics({
        totalRuns: sessionsCount || 0,
        activeAgents: agentsCount || 0,
        loading: false
      });
    }
    fetchMetrics();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KpiCard title="TOTAL RUNS" value={metrics.loading ? "..." : metrics.totalRuns.toString()} trend="across all time" trendUp icon={Activity} />
        <KpiCard title="SUCCESS RATE" value="94.3%" trend="+2.1%" trendUp icon={CheckCircle2} />
        <KpiCard title="AVG RESPONSE" value="38s" trend="-4s faster" trendUp icon={Clock} />
        <KpiCard title="ACTIVE AGENTS" value={metrics.loading ? "..." : metrics.activeAgents.toString()} subtitle="online" icon={Bot} />
      </div>

      {/* 2. Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Activity Timeline */}
        <div className="lg:col-span-2 bg-background-card border border-border rounded-lg p-6 flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold text-text-primary tracking-wide">Activity Timeline</h2>
            <div className="flex items-center gap-4 text-xs font-medium text-text-secondary">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent-green"></div>Success</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent-red"></div>Errors</div>
            </div>
          </div>
          <div className="flex-1 min-h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363D" vertical={false} />
                <XAxis dataKey="day" stroke="#8B949E" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#8B949E" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1C2128', borderColor: '#30363D', borderRadius: '8px', fontSize: '12px', color: '#E6EDF3' }}
                  itemStyle={{ color: '#E6EDF3' }}
                />
                <Line type="monotone" dataKey="success" stroke="#16A34A" strokeWidth={2} dot={{ r: 3, fill: '#16A34A' }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="errors" stroke="#DC2626" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Distribution */}
        <div className="bg-background-card border border-border rounded-lg p-6 flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-text-primary tracking-wide">Task Distribution</h2>
            <MoreHorizontal className="w-4 h-4 text-text-muted cursor-pointer hover:text-text-primary" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center relative min-h-[200px]">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={distributionData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} stroke="none" dataKey="value">
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
              <span className="text-xl font-bold text-text-primary">247</span>
              <span className="text-[10px] text-text-muted font-bold tracking-wider">TOTAL</span>
            </div>
          </div>
          <div className="space-y-3 mt-4">
            {distributionData.map(item => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }}></div>
                  <span className="text-text-secondary">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-text-primary font-medium">{item.value}</span>
                  <span className="text-text-muted font-bold w-8 text-right">{Math.round((item.value/247)*100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 3. Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Runs Table */}
        <div className="lg:col-span-2 bg-background-card border border-border rounded-lg shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border flex items-center justify-between bg-[#1A1F26]">
            <h2 className="text-sm font-bold text-text-primary tracking-wide">Recent Runs</h2>
            <button className="text-xs font-semibold text-accent-blue hover:text-blue-400 transition-colors flex items-center gap-1">
              View All &rarr;
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] text-text-muted font-bold uppercase tracking-wider border-b border-border bg-[#161B22]">
                <tr>
                  <th className="px-5 py-3 font-semibold">ID</th>
                  <th className="px-5 py-3 font-semibold">Task Description</th>
                  <th className="px-5 py-3 font-semibold">Agent Used</th>
                  <th className="px-5 py-3 font-semibold">Duration</th>
                  <th className="px-5 py-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text-secondary">
                {recentRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-background-secondary transition-colors group">
                    <td className="px-5 py-3.5 font-medium text-text-muted group-hover:text-text-secondary">{run.id}</td>
                    <td className="px-5 py-3.5 font-medium text-text-primary">{run.task}</td>
                    <td className="px-5 py-3.5 flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-accent-blue bg-opacity-20 flex items-center justify-center"><Bot className="w-2.5 h-2.5 text-accent-blue"/></div>
                      {run.agent}
                    </td>
                    <td className="px-5 py-3.5">{run.duration}</td>
                    <td className="px-5 py-3.5 text-right">
                      <StatusBadge status={run.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Health Sidebar */}
        <div className="bg-background-card border border-border rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold text-text-primary tracking-wide flex items-center gap-2">
              System Health
              <div className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse"></div>
            </h2>
            <span className="text-[10px] font-bold text-accent-green bg-accent-green bg-opacity-10 px-2 py-1 rounded-full uppercase tracking-wider border border-accent-green border-opacity-20">
              All Operational
            </span>
          </div>

          <div className="space-y-6">
            <HealthItem icon={Database} title="Supabase Database" subtitle="Ping: 12ms" status="Healthy" />
            <HealthItem icon={Zap} title="Groq Inference" subtitle="Ping: 8ms" status="Healthy" />
            <HealthItem icon={Bot} title="Google Gemini" subtitle="Ping: 45ms" status="Healthy" />
            <HealthItem icon={GitBranch} title="GitHub Webhooks" subtitle="Last sync: 2m ago" status="Healthy" />
          </div>
        </div>

      </div>

    </div>
  );
}

// Subcomponents

function KpiCard({ title, value, trend, trendUp, subtitle, icon: Icon }: any) {
  return (
    <div className="bg-background-card border border-border rounded-lg p-5 shadow-sm hover:border-accent-blue transition-colors group">
      <div className="flex items-center justify-between mb-4 text-text-muted">
        <h3 className="text-[11px] font-bold uppercase tracking-wider group-hover:text-text-secondary transition-colors">{title}</h3>
        <Icon className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:text-accent-blue transition-all" />
      </div>
      <div className="flex items-end gap-3">
        <span className="text-3xl font-bold text-text-primary tracking-tight">{value}</span>
        {trend && (
          <span className={`text-xs font-semibold mb-1 ${trendUp ? 'text-accent-green' : 'text-accent-red'}`}>
            {trend}
          </span>
        )}
        {subtitle && (
          <span className="text-xs font-medium text-text-muted mb-1">{subtitle}</span>
        )}
      </div>
    </div>
  );
}

function HealthItem({ icon: Icon, title, subtitle, status }: any) {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-background-secondary border border-border flex items-center justify-center group-hover:border-text-muted transition-colors">
          <Icon className="w-4 h-4 text-text-secondary" />
        </div>
        <div>
          <div className="text-sm font-semibold text-text-primary">{title}</div>
          <div className="text-[11px] font-medium text-text-muted mt-0.5">{subtitle}</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-accent-green">
        {status}
        <CheckCircle2 className="w-3.5 h-3.5" />
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
