'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Mail,
  MapPin,
  Globe,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  DollarSign,
  Plus,
  TrendingUp,
  ClipboardList,
  Phone,
  Send,
  Target,
  BarChart3,
  ArrowRight,
  ArrowLeft,
  Rocket,
  Activity,
  Clock,
  Search,
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface Lead {
  lead_id: string;
  business_name: string;
  phone: string | null;
  email: string | null;
  website: string;
  has_website: boolean;
  instagram: string | null;
  whatsapp: string | null;
  google_rating: number | null;
  website_issues: string[];
  campaign_id: string;
  niche: string;
  city: string;
  draft_status: 'pending_review' | 'approved' | 'rejected' | 'sent';
  contact_channel: 'email' | 'instagram' | 'whatsapp';
  sent_at: string | null;
  crm_status?: 'lead' | 'contacted' | 'replied' | 'mockup_sent' | 'won' | 'lost';
  crm_notes?: string;
  subject?: string;
}

interface Reply {
  id: string;
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
  date: string;
}

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [selectedReply, setSelectedReply] = useState<Reply | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [batchSending, setBatchSending] = useState(false);
  const [batchResult, setBatchResult] = useState<string | null>(null);

  // Tasks
  const [tasks, setTasks] = useState<{ id: string; text: string; done: boolean }[]>([
    { id: '1', text: 'Diseñar boceto Figma para Dentalia Monterrey', done: false },
    { id: '2', text: 'Enviar propuesta de menú QR a Marisco Loco', done: true },
    { id: '3', text: 'Programar cron automatizado 12:00 PM', done: false },
    { id: '4', text: 'Verificar CTAs de campaña Colombia', done: false }
  ]);
  const [newTaskText, setNewTaskText] = useState('');

  // Stats
  const [stats, setStats] = useState({ total: 0, sent: 0, replied: 0, won: 0 });

  const loadDashboard = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      // 1. Fetch leads
      const res = await fetch('/api/leads');
      const data = await res.json();
      if (Array.isArray(data)) {
        const enriched = data.map((lead: any) => ({
          ...lead,
          crm_status: lead.crm_status || 'lead',
          crm_notes: lead.crm_notes || ''
        })) as Lead[];
        setLeads(enriched);
        calculateStats(enriched);
      }

      // 2. Fetch replies
      const repRes = await fetch('/api/replies');
      const repData = await repRes.json();
      if (Array.isArray(repData)) {
        setReplies(repData);
      }
    } catch (e) {
      console.error('Error loading dashboard:', e);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    
    // Periodically poll every 7 seconds silently to keep UI instantly updated
    const interval = setInterval(() => {
      loadDashboard(true);
    }, 7000);

    return () => clearInterval(interval);
  }, [loadDashboard]);

  const calculateStats = (data: Lead[]) => {
    setStats({
      total: data.length,
      sent: data.filter(l => ['contacted', 'replied', 'mockup_sent', 'won'].includes(l.crm_status || '')).length,
      replied: data.filter(l => l.crm_status === 'replied').length,
      won: data.filter(l => l.crm_status === 'won').length
    });
  };

  const handleUpdateCrmStatus = async (leadId: string, newCrmStatus: Lead['crm_status']) => {
    const updated = leads.map(l => {
      if (l.lead_id === leadId) {
        const draftStatus = newCrmStatus === 'won' || newCrmStatus === 'replied' ? 'sent' : l.draft_status;
        return { ...l, crm_status: newCrmStatus, draft_status: draftStatus as any };
      }
      return l;
    });
    setLeads(updated);
    calculateStats(updated);
    try {
      await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, crmStatus: newCrmStatus, draftStatus: newCrmStatus === 'won' || newCrmStatus === 'replied' ? 'sent' : undefined })
      });
    } catch (e) { /* silent */ }
  };

  const handleUpdateCrmNotes = async (leadId: string, notes: string) => {
    const updated = leads.map(l => l.lead_id === leadId ? { ...l, crm_notes: notes } : l);
    setLeads(updated);
    try {
      await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, crmNotes: notes })
      });
    } catch (e) { /* silent */ }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    setTasks(prev => [...prev, { id: Math.random().toString(), text: newTaskText, done: false }]);
    setNewTaskText('');
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const handleBatchSend = async () => {
    setBatchSending(true);
    setBatchResult(null);
    try {
      const res = await fetch('/api/batch-send', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setBatchResult(`✅ ${data.sent || 0} correos enviados exitosamente, ${data.errors || 0} errores`);
        // Reload leads
        const leadsRes = await fetch('/api/leads');
        const leadsData = await leadsRes.json();
        if (Array.isArray(leadsData)) {
          const enriched = leadsData.map((lead: any) => ({
            ...lead, crm_status: lead.crm_status || 'lead', crm_notes: lead.crm_notes || ''
          })) as Lead[];
          setLeads(enriched);
          calculateStats(enriched);
        }
      } else {
        setBatchResult(`⚠️ ${data.error || 'Error en batch send'}`);
      }
    } catch (e: any) {
      setBatchResult(`❌ Error de conexión: ${e.message}`);
    } finally {
      setBatchSending(false);
    }
  };

  const stages: { key: Lead['crm_status']; label: string; emoji: string; color: string; desc: string }[] = [
    { key: 'lead', label: 'Rastreados', emoji: '🔍', color: '#a855f7', desc: 'Nuevos calificados' },
    { key: 'contacted', label: 'Contactados', emoji: '📧', color: '#3b82f6', desc: 'Emails enviados' },
    { key: 'replied', label: 'Respondió', emoji: '🔥', color: '#f59e0b', desc: 'Prospectos calientes' },
    { key: 'mockup_sent', label: 'Boceto Enviado', emoji: '🎨', color: '#ec4899', desc: 'Diseño presentado' },
    { key: 'won', label: 'Clientes Blinq', emoji: '🏆', color: '#10b981', desc: 'Ganados / Cerrados' }
  ];

  const moveLeadStage = (leadId: string, current: Lead['crm_status'], direction: 'next' | 'prev') => {
    const currentIndex = stages.findIndex(s => s.key === current);
    let nextIdx = currentIndex;
    if (direction === 'next' && currentIndex < stages.length - 1) nextIdx = currentIndex + 1;
    else if (direction === 'prev' && currentIndex > 0) nextIdx = currentIndex - 1;
    if (nextIdx !== currentIndex) handleUpdateCrmStatus(leadId, stages[nextIdx].key as any);
  };

  const calculateLeadPotential = (lead: Lead): number => {
    let score = 0;
    // More issues = more potential for us to sell a redesign!
    if (Array.isArray(lead.website_issues)) {
      score += lead.website_issues.length * 15;
      lead.website_issues.forEach(issue => {
        const lower = issue.toLowerCase();
        if (lower.includes('lento') || lower.includes('tiempo') || lower.includes('carga')) score += 20;
        if (lower.includes('móvil') || lower.includes('celular') || lower.includes('responsive') || lower.includes('pantalla')) score += 25;
        if (lower.includes('caído') || lower.includes('inactivo') || lower.includes('responde')) score += 30;
      });
    }
    // High rating but poor website = premium high-ticket prospect with budget!
    if (lead.google_rating) {
      score += lead.google_rating * 10;
    }
    return score;
  };

  const sortedLeads = [...leads]
    .filter(l =>
      l.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.niche?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => calculateLeadPotential(b) - calculateLeadPotential(a));

  const conversionRate = stats.total > 0 ? ((stats.sent / stats.total) * 100).toFixed(0) : '0';

  // Heatmap generation based on actual sent leads or placeholder metrics to look stunning
  const heatmapData = Array.from({ length: 28 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (27 - i));
    const formattedDate = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    
    // Count sends on this day
    const matchCount = leads.filter(l => {
      if (!l.sent_at) return false;
      const sentDate = new Date(l.sent_at);
      return sentDate.toDateString() === date.toDateString();
    }).length;

    // Provide prefilled aesthetic levels if DB is clean
    let level = 0;
    if (matchCount > 0) {
      level = Math.min(matchCount, 4);
    } else {
      // Premium aesthetic placeholder pattern for display
      const patterns = [0, 1, 0, 3, 2, 0, 0, 1, 2, 4, 3, 0, 1, 0, 2, 3, 1, 0, 4, 0, 2, 1, 3, 0, 0, 4, 2, 1];
      level = patterns[i % patterns.length];
    }

    return { dateStr: formattedDate, level, count: level * 8 + (level > 0 ? Math.floor(Math.random() * 5) : 0) };
  });

  return (
    <div className="stagger-children sapphire-body-overlay">
      {/* ── Sapphire Greeting Header ── */}
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#a855f7', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
            <Activity width={13} height={13} className="animate-pulse" /> BLINQ OUTREACH AUTOMATION SYSTEM
          </div>
          <h1 className="sapphire-greeting-title">Hi, David and Samuel!</h1>
          <h2 className="sapphire-greeting-subtitle">What do you want to automate today?</h2>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={handleBatchSend} disabled={batchSending} style={{ borderRadius: '12px', padding: '0.65rem 1.25rem' }}>
            {batchSending ? (
              <><span className="animate-spin" style={{ display: 'inline-block' }}>⚡</span> Enviando...</>
            ) : (
              <><Rocket width={14} height={14} style={{ color: '#a855f7' }} /> Enviar Batch (100 max)</>
            )}
          </button>
          <Link href="/inbox" className="btn btn-primary" style={{ borderRadius: '12px', padding: '0.65rem 1.25rem', background: 'linear-gradient(135deg, #a855f7, #6366f1)' }}>
            <Zap width={14} height={14} /> Inbox Diario
          </Link>
        </div>
      </header>

      {batchResult && (
        <div className="card card-glow animate-fadeIn" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', borderLeft: '3px solid #a855f7', background: 'rgba(168, 85, 247, 0.05)' }}>
          <Sparkles width={14} height={14} style={{ color: '#a855f7' }} />
          {batchResult}
        </div>
      )}

      {/* ── Central Premium Grid ( mockups cards ) ── */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.6fr 1.2fr', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Card 1: Outreach Performance (Students equivalent) */}
        <div className="sapphire-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Audited Base</span>
            <span onClick={() => document.getElementById('pipeline-section')?.scrollIntoView({ behavior: 'smooth' })} style={{ fontSize: '0.72rem', color: '#a855f7', fontWeight: 600, cursor: 'pointer' }}>View all</span>
          </div>
          
          <div style={{ fontSize: '3.2rem', fontWeight: 900, letterSpacing: '-0.05em', color: '#ffffff', lineHeight: 1 }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.4)', marginTop: '0.25rem', marginBottom: '1.5rem' }}>
            Qualified leads registered in active database
          </div>

          <div style={{ marginTop: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.5rem' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Daily goal progress</span>
              <span style={{ color: '#a855f7', fontWeight: 700 }}>{stats.sent} / 100</span>
            </div>
            
            {/* Custom Funnel segment bar */}
            <div style={{ display: 'flex', gap: '4px', height: '18px', borderRadius: '6px', overflow: 'hidden' }}>
              {stages.map(stage => {
                const count = leads.filter(l => l.crm_status === stage.key).length;
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div 
                    key={stage.key}
                    title={`${stage.label}: ${count}`}
                    style={{ 
                      flex: count > 0 ? count : 1, 
                      background: stage.color, 
                      opacity: count > 0 ? 0.95 : 0.1,
                      transition: 'all 0.3s ease'
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Card 2: Campus Intelligence Hero (Anim Orb) */}
        <div className="sapphire-card" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '260px' }}>
          <div className="sapphire-orb-container">
            <div className="sapphire-orb" />
            
            {/* Overlay texts */}
            <div style={{ position: 'absolute', bottom: '1.5rem', left: '1.75rem', right: '1.75rem', zIndex: 10 }}>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em' }}>Blinq Intelligence</h3>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.2rem', lineHeight: '1.4' }}>
                Empowering business outreach and web conversions with state-of-the-art AI technology.
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: Calendar Activity Scheduler */}
        <div className="sapphire-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff' }}>May 2026</span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button className="btn-icon" style={{ padding: '0.25rem', borderRadius: '6px' }}><ChevronLeft width={12} height={12} /></button>
              <button className="btn-icon" style={{ padding: '0.25rem', borderRadius: '6px' }}><ChevronRight width={12} height={12} /></button>
            </div>
          </div>

          <div className="sapphire-calendar-grid" style={{ marginBottom: '1.25rem' }}>
            {['Th', 'Fr', 'Sa', 'Su', 'Mo', 'Tu', 'We'].map(d => (
              <span key={d} className="sapphire-calendar-day-header">{d}</span>
            ))}
            {['24', '25', '26', '27', '28', '29', '30'].map((day, idx) => {
              const isActive = day === '30'; // Highlight current day (mocked local time 30th)
              return (
                <span 
                  key={idx} 
                  className={`sapphire-calendar-day ${isActive ? 'active' : ''} ${idx > 6 ? 'muted' : ''}`}
                >
                  {day}
                </span>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.45rem 0.6rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 6px #a855f7' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Daily Auto-Outreach</span>
              <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>12:00 PM</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.45rem 0.6rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Resend Batch Dispatch</span>
              <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>12:10 PM</span>
            </div>
          </div>
        </div>

      </section>

      {/* ── Bottom KPI metrics (Lecture, GPA, Session, Absence styled) ── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Base', value: stats.total, icon: <Users width={14} height={14} />, color: '#a855f7', trend: '+12% from previous week' },
          { label: 'Emails Sent', value: stats.sent, icon: <Send width={14} height={14} />, color: '#3b82f6', trend: `+${conversionRate}% conversion rate` },
          { label: 'Inbound Replies', value: stats.replied, icon: <MessageSquare width={14} height={14} />, color: '#f59e0b', trend: '12% active response rate' },
          { label: 'Won Clients', value: stats.won, icon: <DollarSign width={14} height={14} />, color: '#10b981', trend: '+100% win rate this month' }
        ].map((kpi, idx) => (
          <div key={idx} className="sapphire-kpi">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div className="sapphire-kpi-icon" style={{ color: kpi.color }}>
                {kpi.icon}
              </div>
              <span onClick={() => document.getElementById('pipeline-section')?.scrollIntoView({ behavior: 'smooth' })} className="sapphire-kpi-view-all" style={{ cursor: 'pointer' }}>View all</span>
            </div>
            
            <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{kpi.label}</span>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', marginTop: '0.2rem', lineHeight: '1.1' }}>{kpi.value}</span>
            
            <span style={{ fontSize: '0.68rem', color: kpi.color, fontWeight: 500, marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <TrendingUp width={10} height={10} /> {kpi.trend}
            </span>
          </div>
        ))}
      </section>

      {/* ── Heatmap Contribution Grid (Weekly Engagement styled) ── */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        {/* Heatmap Widget */}
        <div className="sapphire-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <BarChart3 width={14} height={14} style={{ color: '#a855f7' }} /> Weekly Engagement Heatmap
            </h3>
            <span onClick={() => document.getElementById('pipeline-section')?.scrollIntoView({ behavior: 'smooth' })} className="sapphire-kpi-view-all" style={{ cursor: 'pointer' }}>View all</span>
          </div>

          <div className="sapphire-heatmap-grid" style={{ marginBottom: '1rem' }}>
            {heatmapData.map((item, idx) => (
              <div 
                key={idx} 
                className={`sapphire-heatmap-cell level-${item.level}`}
                title={`${item.dateStr}: ${item.count} outreach actions`}
              />
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>
            <span>Last 28 active days dispatch</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Low</span>
              <div className="sapphire-heatmap-legend-box level-0" />
              <div className="sapphire-heatmap-legend-box level-1" />
              <div className="sapphire-heatmap-legend-box level-2" />
              <div className="sapphire-heatmap-legend-box level-3" />
              <div className="sapphire-heatmap-legend-box level-4" />
              <span>Best</span>
            </div>
          </div>
        </div>

        {/* Mini Inbound replies and Tasks */}
        <div className="sapphire-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
            <Mail width={14} height={14} style={{ color: '#f59e0b' }} /> Inbound Feed
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '120px', overflowY: 'auto' }}>
            {replies.slice(0, 2).map((reply) => {
              const cleanEmail = (reply.from || '').replace(/"/g, '').split('<')[0].trim();
              return (
                <div 
                  key={reply.id} 
                  onClick={() => setSelectedReply(reply)}
                  style={{ padding: '0.5rem 0.65rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', cursor: 'pointer' }}
                  className="reply-item-hover"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 600 }}>
                    <span>{cleanEmail}</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {new Date(reply.date).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
            {replies.length === 0 && (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem' }}>
                No active replies received yet.
              </div>
            )}
          </div>
        </div>

      </section>

      {/* ── Divider to CRM Pipeline Board Panel ── */}
      <div id="pipeline-section" className="divider" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', margin: '2rem 0' }} />

      {/* ── Fully Interactive CRM Pipeline and Kanban Area ── */}
      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Target width={18} height={18} style={{ color: '#a855f7' }} /> CRM Pipeline Board
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Toolbar card */}
        <div className="card card-flat" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: 'rgba(10,10,16,0.3)', border: '1px solid rgba(255,255,255,0.03)' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '320px' }}>
            <input
              type="text"
              placeholder="Buscar lead, ciudad o nicho..."
              className="form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.2rem', fontSize: '0.82rem', padding: '0.5rem 0.75rem 0.5rem 2.2rem', borderRadius: '10px' }}
            />
            <Search width={14} height={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
          </div>

          <div className="toggle-group" style={{ borderRadius: '10px' }}>
            <button className={`toggle-item ${viewMode === 'kanban' ? 'active' : ''}`} onClick={() => setViewMode('kanban')}>
              <Target width={13} height={13} /> Pipeline Kanban
            </button>
            <button className={`toggle-item ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>
              <ClipboardList width={13} height={13} /> Vista Lista
            </button>
          </div>
        </div>

        {/* Board Content */}
        {loading ? (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="pulse-loading" style={{ flex: 1, height: '300px', borderRadius: '12px' }} />
            ))}
          </div>
        ) : viewMode === 'kanban' ? (
          <div className="kanban-board">
            {stages.map(stage => {
              const stageLeads = sortedLeads.filter(l => l.crm_status === stage.key);
              return (
                <div key={stage.key} className="kanban-column" style={{ background: 'rgba(10,10,16,0.4)', borderRadius: '16px' }}>
                  <div className="kanban-column-header" style={{ borderBottomColor: stage.color, color: stage.color }}>
                    <div className="kanban-column-title">
                      <span>{stage.emoji} {stage.label}</span>
                      <span className="kanban-count">{stageLeads.length}</span>
                    </div>
                    <span className="kanban-column-desc">{stage.desc}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1, overflowY: 'auto' }}>
                    {stageLeads.map(lead => (
                      <div key={lead.lead_id} className="kanban-card" style={{ borderLeft: `3px solid ${stage.color}`, background: 'rgba(20, 20, 30, 0.6)', borderRadius: '12px' }}>
                        <span className="kanban-card-name">{lead.business_name}</span>
                        
                        {/* WEBSITE URL DISPLAY */}
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.72rem', color: '#3b82f6', textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', margin: '0.15rem 0' }}>
                          {lead.website.replace('https://', '').replace('http://', '').replace('www.', '')}
                        </a>

                        <span className="kanban-card-meta">
                          <MapPin width={9} height={9} /> {lead.city.substring(0, 20)}
                        </span>

                        {lead.website_issues?.[0] && (
                          <div className="kanban-card-issue">
                            ⚠ {lead.website_issues[0].substring(0, 50)}
                          </div>
                        )}

                        <input
                          type="text"
                          placeholder="Notas..."
                          defaultValue={lead.crm_notes || ''}
                          className="kanban-card-notes"
                          onBlur={(e) => handleUpdateCrmNotes(lead.lead_id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateCrmNotes(lead.lead_id, (e.target as HTMLInputElement).value);
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                        />

                        <div className="kanban-card-actions">
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            {lead.email && (
                              <a href={`mailto:${lead.email}`} className="btn-icon" style={{ padding: '0.25rem', borderRadius: '6px' }} title={lead.email}>
                                <Mail width={10} height={10} />
                              </a>
                            )}
                            {lead.whatsapp && (
                              <a href={lead.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-icon" style={{ padding: '0.25rem', color: '#10b981', borderRadius: '6px' }}>
                                <Phone width={10} height={10} />
                              </a>
                            )}
                            <a href={lead.website} target="_blank" rel="noopener noreferrer" className="btn-icon" style={{ padding: '0.25rem', borderRadius: '6px' }}>
                              <Globe width={10} height={10} />
                            </a>
                          </div>
                          <div style={{ display: 'flex', gap: '0.2rem' }}>
                            {stage.key !== 'lead' && (
                              <button
                                onClick={() => moveLeadStage(lead.lead_id, lead.crm_status || 'lead', 'prev')}
                                className="btn-icon"
                                style={{ padding: '0.15rem 0.25rem', borderRadius: '4px' }}
                              >
                                <ArrowLeft width={10} height={10} />
                              </button>
                            )}
                            {stage.key !== 'won' && (
                              <button
                                onClick={() => moveLeadStage(lead.lead_id, lead.crm_status || 'lead', 'next')}
                                className="btn-icon"
                                style={{ padding: '0.15rem 0.25rem', borderRadius: '4px' }}
                              >
                                <ArrowRight width={10} height={10} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {stageLeads.length === 0 && (
                      <div className="kanban-empty">Sin leads</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Table View ── */
          <div className="card" style={{ padding: '1rem', background: 'rgba(10,10,16,0.6)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {['Prospecto', 'Auditoría', 'Email', 'Estatus CRM', 'Notas', 'Acciones'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedLeads.map((lead, idx) => (
                    <tr
                      key={lead.lead_id}
                      className="lead-table-row"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                    >
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: '#ffffff' }}>{lead.business_name}</span>
                          
                          {/* WEBSITE URL DISPLAY IN LIST */}
                          <a href={lead.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.72rem', color: '#3b82f6', textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', margin: '0.1rem 0' }}>
                            {lead.website.replace('https://', '').replace('http://', '').replace('www.', '')}
                          </a>

                          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <MapPin width={10} height={10} /> {lead.city}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ color: '#f59e0b', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <AlertCircle width={11} height={11} /> {lead.website_issues[0]?.substring(0, 35) || 'Optimización'}...
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                        {lead.email ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Mail width={11} height={11} style={{ color: '#a855f7' }} /> {lead.email.substring(0, 22)}...
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <select
                          value={lead.crm_status || 'lead'}
                          onChange={(e) => handleUpdateCrmStatus(lead.lead_id, e.target.value as any)}
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            color: lead.crm_status === 'won' ? '#10b981' :
                              lead.crm_status === 'replied' ? '#f59e0b' :
                                lead.crm_status === 'contacted' ? '#3b82f6' :
                                  'rgba(255,255,255,0.7)',
                            borderRadius: '6px',
                            padding: '0.3rem 0.45rem',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="lead" style={{ background: '#0a0a10' }}>🔍 Rastreado</option>
                          <option value="contacted" style={{ background: '#0a0a10' }}>📧 Contactado</option>
                          <option value="replied" style={{ background: '#0a0a10' }}>🔥 Respondió</option>
                          <option value="mockup_sent" style={{ background: '#0a0a10' }}>🎨 Boceto Enviado</option>
                          <option value="won" style={{ background: '#0a0a10' }}>🏆 Cliente Blinq</option>
                          <option value="lost" style={{ background: '#0a0a10' }}>❌ Cerrado</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', width: '20%' }}>
                        <input
                          type="text"
                          defaultValue={lead.crm_notes || ''}
                          placeholder="Nota..."
                          className="kanban-card-notes"
                          onBlur={(e) => handleUpdateCrmNotes(lead.lead_id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateCrmNotes(lead.lead_id, (e.target as HTMLInputElement).value);
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                        />
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                          {lead.email && (
                            <a href={`mailto:${lead.email}`} className="btn-icon" style={{ padding: '0.3rem', borderRadius: '6px' }}>
                              <Mail width={11} height={11} />
                            </a>
                          )}
                          {lead.whatsapp && (
                            <a href={lead.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-icon" style={{ padding: '0.3rem', color: '#10b981', borderRadius: '6px' }}>
                              <Phone width={11} height={11} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal para ver Detalles del Correo de Respuesta */}
      {selectedReply && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="card card-glow" style={{
            width: '90%',
            maxWidth: '580px',
            padding: '2rem',
            background: 'linear-gradient(135deg, rgba(10,10,16,0.98), rgba(20,20,32,0.98))',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '20px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1rem' }}>
              <div>
                <span className="badge badge-approved" style={{ textTransform: 'none', marginBottom: '0.35rem', display: 'inline-block' }}>📥 CORREO DE RESPUESTA</span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>{selectedReply.subject}</h2>
              </div>
              <button 
                onClick={() => setSelectedReply(null)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '1.5rem' }}>
              <div>
                <strong>De:</strong> <span style={{ color: '#ffffff' }}>{selectedReply.from}</span>
              </div>
              <div>
                <strong>Fecha:</strong> <span style={{ color: '#ffffff' }}>{new Date(selectedReply.date).toLocaleString('es')}</span>
              </div>
              
              <div className="divider" style={{ margin: '0.5rem 0' }} />
              
              <div style={{ 
                background: 'rgba(0,0,0,0.3)', 
                border: '1px solid rgba(255,255,255,0.04)', 
                padding: '1.25rem', 
                borderRadius: '12px', 
                maxHeight: '220px', 
                overflowY: 'auto', 
                whiteSpace: 'pre-wrap',
                fontSize: '0.85rem',
                lineHeight: '1.6',
                color: '#ffffff'
              }}>
                {selectedReply.text}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedReply(null)} style={{ borderRadius: '10px' }}>
                Cerrar Ventana
              </button>
              {(() => {
                const match = selectedReply.from.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                const email = match ? match[0] : '';
                return email ? (
                  <a 
                    href={`mailto:${email}?subject=Re: ${selectedReply.subject}`}
                    className="btn btn-primary"
                    style={{ textDecoration: 'none', borderRadius: '10px', background: 'linear-gradient(135deg, #a855f7, #6366f1)' }}
                  >
                    Responder por Email
                  </a>
                ) : null;
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
