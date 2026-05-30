'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Mail,
  MapPin,
  Globe,
  ExternalLink,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  DollarSign,
  Plus,
  TrendingUp,
  UserCheck,
  ClipboardList,
  Phone,
  Send,
  Target,
  BarChart3,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Rocket,
  Activity,
  Clock,
  Search,
  Filter
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
    { key: 'lead', label: 'Rastreados', emoji: '🔍', color: 'hsl(var(--color-primary))', desc: 'Nuevos calificados' },
    { key: 'contacted', label: 'Contactados', emoji: '📧', color: 'hsl(var(--color-info))', desc: 'Emails enviados' },
    { key: 'replied', label: 'Respondió', emoji: '🔥', color: 'hsl(var(--color-warning))', desc: 'Prospectos calientes' },
    { key: 'mockup_sent', label: 'Boceto Enviado', emoji: '🎨', color: 'hsl(var(--color-accent))', desc: 'Diseño presentado' },
    { key: 'won', label: 'Clientes Blinq', emoji: '🏆', color: 'hsl(var(--color-success))', desc: 'Ganados / Cerrados' }
  ];

  const moveLeadStage = (leadId: string, current: Lead['crm_status'], direction: 'next' | 'prev') => {
    const currentIndex = stages.findIndex(s => s.key === current);
    let nextIdx = currentIndex;
    if (direction === 'next' && currentIndex < stages.length - 1) nextIdx = currentIndex + 1;
    else if (direction === 'prev' && currentIndex > 0) nextIdx = currentIndex - 1;
    if (nextIdx !== currentIndex) handleUpdateCrmStatus(leadId, stages[nextIdx].key as any);
  };

  const filteredLeads = leads.filter(l =>
    l.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.niche?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const conversionRate = stats.total > 0 ? ((stats.sent / stats.total) * 100).toFixed(0) : '0';

  return (
    <div className="stagger-children">
      {/* ── Header ── */}
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'hsl(var(--color-primary))', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
            <Activity width={13} height={13} /> Workspace Blinq v4.0
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.04em' }}>CRM & Pipelines</h1>
          <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.15rem', fontSize: '0.9rem' }}>
            Leads calificados, seguimiento y contratos cerrados.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleBatchSend} disabled={batchSending} style={{ fontSize: '0.82rem' }}>
            {batchSending ? (
              <><span className="animate-spin" style={{ display: 'inline-block' }}>⚡</span> Enviando...</>
            ) : (
              <><Rocket width={14} height={14} /> Enviar Batch (100 max)</>
            )}
          </button>
          <a href="/inbox" className="btn btn-primary" style={{ fontSize: '0.82rem' }}>
            <Zap width={14} height={14} /> Inbox Diario
          </a>
        </div>
      </header>

      {batchResult && (
        <div className="card card-flat animate-fadeIn" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', borderLeft: '3px solid hsl(var(--color-primary))' }}>
          <Sparkles width={14} height={14} style={{ color: 'hsl(var(--color-primary))' }} />
          {batchResult}
        </div>
      )}

      {/* ── KPIs ── */}
      <section className="grid-cols-4 stagger-children" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Base de Datos', value: stats.total, icon: <Users width={20} height={20} />, color: '--color-primary', trend: 'Prospectos LATAM + USA' },
          { label: 'Correos Enviados', value: stats.sent, icon: <Send width={20} height={20} />, color: '--color-info', trend: `${conversionRate}% tasa contacto` },
          { label: 'Respondieron', value: stats.replied, icon: <MessageSquare width={20} height={20} />, color: '--color-warning', trend: 'Prospectos calientes' },
          { label: 'Clientes Cerrados', value: stats.won, icon: <DollarSign width={20} height={20} />, color: '--color-success', trend: 'Revenue Blinq' }
        ].map((kpi, i) => (
          <div key={i} className="card kpi-card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `hsl(var(${kpi.color}))`, borderRadius: '2px 2px 0 0' }} />
            <div className="kpi-details">
              <span className="kpi-label">{kpi.label}</span>
              <span className="kpi-value">{kpi.value}</span>
              <span className="kpi-trend">
                <TrendingUp width={11} height={11} /> {kpi.trend}
              </span>
            </div>
            <div className="kpi-icon" style={{ color: `hsl(var(${kpi.color}))` }}>
              {kpi.icon}
            </div>
          </div>
        ))}
      </section>

      {/* ── Funnel Bar ── */}
      <section className="card card-flat" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <BarChart3 width={16} height={16} style={{ color: 'hsl(var(--color-primary))' }} /> Embudo de Conversión
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>Hoy • {new Date().toLocaleDateString('es')}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', height: '8px', borderRadius: '99px', overflow: 'hidden', background: 'rgba(255,255,255,0.03)' }}>
          {stages.map(stage => {
            const count = leads.filter(l => l.crm_status === stage.key).length;
            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <div
                key={stage.key}
                title={`${stage.label}: ${count} (${pct.toFixed(0)}%)`}
                style={{
                  width: `${Math.max(pct, 2)}%`,
                  background: stage.color,
                  borderRadius: '99px',
                  transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                  opacity: 0.85
                }}
              />
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          {stages.map(stage => {
            const count = leads.filter(l => l.crm_status === stage.key).length;
            return (
              <div key={stage.key} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', color: 'hsl(var(--text-muted))' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: stage.color }} />
                {stage.emoji} {stage.label}: <strong style={{ color: 'hsl(var(--text-secondary))' }}>{count}</strong>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Main Grid ── */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem' }}>
        {/* ── Pipeline Board ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Toolbar */}
          <div className="card card-flat" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '320px' }}>
              <input
                type="text"
                placeholder="Buscar lead, ciudad o nicho..."
                className="form-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.2rem', fontSize: '0.82rem', padding: '0.5rem 0.75rem 0.5rem 2.2rem' }}
              />
              <Search width={14} height={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
            </div>

            <div className="toggle-group">
              <button className={`toggle-item ${viewMode === 'kanban' ? 'active' : ''}`} onClick={() => setViewMode('kanban')}>
                <Target width={13} height={13} /> Pipeline
              </button>
              <button className={`toggle-item ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>
                <ClipboardList width={13} height={13} /> Lista
              </button>
            </div>
          </div>

          {/* Board Content */}
          {loading ? (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="pulse-loading" style={{ flex: 1, height: '300px', borderRadius: 'var(--radius-md)' }} />
              ))}
            </div>
          ) : viewMode === 'kanban' ? (
            <div className="kanban-board">
              {stages.map(stage => {
                const stageLeads = filteredLeads.filter(l => l.crm_status === stage.key);
                return (
                  <div key={stage.key} className="kanban-column">
                    <div className="kanban-column-header" style={{ borderBottomColor: stage.color, color: stage.color }}>
                      <div className="kanban-column-title">
                        <span>{stage.emoji} {stage.label}</span>
                        <span className="kanban-count">{stageLeads.length}</span>
                      </div>
                      <span className="kanban-column-desc">{stage.desc}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto' }}>
                      {stageLeads.map(lead => (
                        <div key={lead.lead_id} className="kanban-card" style={{ borderLeft: `3px solid ${stage.color}` }}>
                          <span className="kanban-card-name">{lead.business_name}</span>
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
                                <a href={`mailto:${lead.email}`} className="btn-icon" style={{ padding: '0.2rem' }} title={lead.email}>
                                  <Mail width={10} height={10} />
                                </a>
                              )}
                              {lead.whatsapp && (
                                <a href={lead.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-icon" style={{ padding: '0.2rem', color: 'hsl(var(--color-success))' }}>
                                  <Phone width={10} height={10} />
                                </a>
                              )}
                              <a href={lead.website} target="_blank" rel="noopener noreferrer" className="btn-icon" style={{ padding: '0.2rem' }}>
                                <Globe width={10} height={10} />
                              </a>
                            </div>
                            <div style={{ display: 'flex', gap: '0.2rem' }}>
                              {stage.key !== 'lead' && (
                                <button
                                  onClick={() => moveLeadStage(lead.lead_id, lead.crm_status || 'lead', 'prev')}
                                  className="btn-icon"
                                  style={{ padding: '0.15rem 0.25rem' }}
                                >
                                  <ArrowLeft width={10} height={10} />
                                </button>
                              )}
                              {stage.key !== 'won' && (
                                <button
                                  onClick={() => moveLeadStage(lead.lead_id, lead.crm_status || 'lead', 'next')}
                                  className="btn-icon"
                                  style={{ padding: '0.15rem 0.25rem' }}
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
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                      {['Prospecto', 'Auditoría', 'Email', 'Estatus CRM', 'Notas', 'Acciones'].map(h => (
                        <th key={h} style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'hsl(var(--text-muted))', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead, idx) => (
                      <tr
                        key={lead.lead_id}
                        className="lead-table-row"
                        style={{ borderBottom: '1px solid var(--border-subtle)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                      >
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: 'hsl(var(--text-primary))' }}>{lead.business_name}</span>
                            <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.1rem' }}>
                              <MapPin width={10} height={10} /> {lead.city}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ color: 'hsl(var(--color-warning))', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <AlertCircle width={11} height={11} /> {lead.website_issues[0]?.substring(0, 35) || 'Optimización'}...
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'hsl(var(--text-muted))', fontSize: '0.8rem' }}>
                          {lead.email ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Mail width={11} height={11} style={{ color: 'hsl(var(--color-primary))' }} /> {lead.email.substring(0, 22)}...
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <select
                            value={lead.crm_status || 'lead'}
                            onChange={(e) => handleUpdateCrmStatus(lead.lead_id, e.target.value as any)}
                            style={{
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid var(--border-default)',
                              color: lead.crm_status === 'won' ? 'hsl(var(--color-success))' :
                                lead.crm_status === 'replied' ? 'hsl(var(--color-warning))' :
                                  lead.crm_status === 'contacted' ? 'hsl(var(--color-info))' :
                                    'hsl(var(--text-secondary))',
                              borderRadius: 'var(--radius-xs)',
                              padding: '0.3rem 0.45rem',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              outline: 'none',
                              fontFamily: 'var(--font-sans)'
                            }}
                          >
                            <option value="lead" style={{ background: '#0f111a' }}>🔍 Rastreado</option>
                            <option value="contacted" style={{ background: '#0f111a' }}>📧 Contactado</option>
                            <option value="replied" style={{ background: '#0f111a' }}>🔥 Respondió</option>
                            <option value="mockup_sent" style={{ background: '#0f111a' }}>🎨 Boceto Enviado</option>
                            <option value="won" style={{ background: '#0f111a' }}>🏆 Cliente Blinq</option>
                            <option value="lost" style={{ background: '#0f111a' }}>❌ Cerrado</option>
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
                              <a href={`mailto:${lead.email}`} className="btn-icon" style={{ padding: '0.3rem' }}>
                                <Mail width={11} height={11} />
                              </a>
                            )}
                            {lead.whatsapp && (
                              <a href={lead.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-icon" style={{ padding: '0.3rem', color: 'hsl(var(--color-success))' }}>
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

        {/* ── Right Sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Quick Stats */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
              <Activity width={15} height={15} style={{ color: 'hsl(var(--color-accent))' }} /> Resumen Rápido
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {[
                { label: 'Resend Diario', value: `${stats.sent}/100`, color: '--color-info' },
                { label: 'Tasa Contacto', value: `${conversionRate}%`, color: '--color-primary' },
                { label: 'Prospectos Hoy', value: `${stats.total}`, color: '--color-accent' },
              ].map((stat, i) => (
                <div key={i} className="stat-pill" style={{ justifyContent: 'space-between' }}>
                  <span>{stat.label}</span>
                  <span style={{ color: `hsl(var(${stat.color}))`, fontWeight: 700 }}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bandeja de Respuestas (Inbound Emails) */}
          <div className="card card-glow" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
              <Mail width={15} height={15} style={{ color: 'hsl(var(--color-warning))' }} /> Respuestas Recibidas ({replies.length})
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '240px', overflowY: 'auto' }}>
              {replies.map((reply) => {
                const cleanEmail = (reply.from || '').replace(/"/g, '').split('<')[0].trim();
                const snippet = (reply.text || '').substring(0, 50) + (reply.text.length > 50 ? '...' : '');
                
                return (
                  <div 
                    key={reply.id} 
                    onClick={() => setSelectedReply(reply)}
                    style={{ 
                      padding: '0.65rem 0.8rem', 
                      background: 'rgba(255,255,255,0.02)', 
                      border: '1px solid var(--glass-border)', 
                      borderRadius: 'var(--radius-sm)', 
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                    }}
                    className="reply-item-hover"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, color: 'hsl(var(--text-primary))' }}>
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }}>{cleanEmail}</span>
                      <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', fontWeight: 400 }}>
                        {new Date(reply.date).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-secondary))', marginTop: '0.15rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{reply.subject}</div>
                    <div style={{ fontSize: '0.70rem', color: 'hsl(var(--text-muted))', marginTop: '0.2rem', fontStyle: 'italic' }}>"{snippet}"</div>
                  </div>
                );
              })}
              
              {replies.length === 0 && (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'hsl(var(--text-muted))', fontSize: '0.78rem', border: '1.5px dashed var(--glass-border)', borderRadius: 'var(--radius-sm)' }}>
                  Sin correos de respuesta aún.
                </div>
              )}
            </div>
          </div>

          {/* Tasks */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem' }}>
              <ClipboardList width={15} height={15} style={{ color: 'hsl(var(--color-warning))' }} />
              <h3 style={{ fontSize: '0.88rem', fontWeight: 700 }}>Tareas</h3>
              <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'hsl(var(--text-muted))' }}>
                {tasks.filter(t => t.done).length}/{tasks.length}
              </span>
            </div>

            <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Nueva tarea..."
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                style={{ padding: '0.4rem 0.65rem', fontSize: '0.78rem' }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 0.55rem' }}>
                <Plus width={13} height={13} />
              </button>
            </form>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto' }}>
              {tasks.map(t => (
                <li
                  key={t.id}
                  onClick={() => toggleTask(t.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                    fontSize: '0.78rem',
                    textDecoration: t.done ? 'line-through' : 'none',
                    color: t.done ? 'hsl(var(--text-muted))' : 'hsl(var(--text-secondary))',
                    padding: '0.45rem 0.55rem',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-xs)',
                    cursor: 'pointer',
                    transition: 'all 150ms ease'
                  }}
                >
                  <div style={{
                    width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0,
                    border: t.done ? 'none' : '1.5px solid hsl(var(--text-muted))',
                    background: t.done ? 'hsl(var(--color-success))' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {t.done && <CheckCircle2 width={10} height={10} style={{ strokeWidth: 3, color: '#fff' }} />}
                  </div>
                  <span style={{ flex: 1 }}>{t.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Automation Info */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'hsl(var(--color-accent))', marginBottom: '0.5rem' }}>
              <Clock width={14} height={14} /> Automatización
            </h4>
            <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', lineHeight: '1.55' }}>
              El cron job diario busca leads automáticamente a las <strong style={{ color: 'hsl(var(--text-secondary))' }}>12:00 PM</strong>. Las respuestas de clientes llegarán a <strong style={{ color: 'hsl(var(--text-secondary))' }}>contacto@blinqoficial.com</strong> en Google Workspace.
            </p>
            <div className="divider" />
            <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', lineHeight: '1.55' }}>
              Cuando un prospecto responda, muévelo a <strong style={{ color: 'hsl(var(--color-warning))' }}>🔥 Respondió</strong> en el pipeline para iniciar el proceso de boceto Figma.
            </p>
          </div>
        </div>
      </section>

      {/* Modal para ver Detalles del Correo de Respuesta */}
      {selectedReply && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
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
            background: 'linear-gradient(135deg, rgba(15,17,26,0.95), rgba(20,24,40,0.95))',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
              <div>
                <span className="badge badge-approved" style={{ textTransform: 'none', marginBottom: '0.35rem', display: 'inline-block' }}>📥 CORREO DE RESPUESTA</span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{selectedReply.subject}</h2>
              </div>
              <button 
                onClick={() => setSelectedReply(null)}
                style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '1.5rem' }}>
              <div>
                <strong>De:</strong> <span style={{ color: 'hsl(var(--text-primary))' }}>{selectedReply.from}</span>
              </div>
              <div>
                <strong>Fecha:</strong> <span style={{ color: 'hsl(var(--text-primary))' }}>{new Date(selectedReply.date).toLocaleString('es')}</span>
              </div>
              
              <div className="divider" style={{ margin: '0.5rem 0' }} />
              
              <div style={{ 
                background: 'rgba(0,0,0,0.2)', 
                border: '1px solid var(--glass-border)', 
                padding: '1.25rem', 
                borderRadius: 'var(--radius-sm)', 
                maxHeight: '220px', 
                overflowY: 'auto', 
                whiteSpace: 'pre-wrap',
                fontSize: '0.85rem',
                lineHeight: '1.6',
                color: 'hsl(var(--text-primary))'
              }}>
                {selectedReply.text}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedReply(null)}>
                Cerrar Ventana
              </button>
              {(() => {
                const match = selectedReply.from.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                const email = match ? match[0] : '';
                return email ? (
                  <a 
                    href={`mailto:${email}?subject=Re: ${selectedReply.subject}`}
                    className="btn btn-primary"
                    style={{ textDecoration: 'none' }}
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
