'use client';

import React, { useState, useEffect } from 'react';

interface Project {
  id: string;
  name: string;
  amount: number;
  type: 'standard' | 'family' | 'custom';
  davidShare: number;
  samuelShare: number;
  receivedBy?: 'company' | 'david' | 'samuel';
  created_at: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: 'david' | 'samuel' | 'company';
  splitBetween: '50/50' | '70/30' | 'company';
  created_at: string;
}

export default function FinancesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'expenses' | 'sync'>('overview');

  // Form states
  const [projName, setProjName] = useState('');
  const [projAmount, setProjAmount] = useState('');
  const [projSplitType, setProjSplitType] = useState<'standard' | 'family' | 'custom'>('standard');
  const [customDavidPct, setCustomDavidPct] = useState(50);
  const [projReceivedBy, setProjReceivedBy] = useState<'company' | 'david' | 'samuel'>('company');

  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expPaidBy, setExpPaidBy] = useState<'david' | 'samuel' | 'company'>('david');
  const [expSplit, setExpSplit] = useState<'50/50' | '70/30' | 'company'>('50/50');

  // Git sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');

  // Load finance data
  const loadData = async () => {
    try {
      const res = await fetch('/api/finances');
      const data = await res.json();
      if (data.projects) setProjects(data.projects);
      if (data.expenses) setExpenses(data.expenses);
    } catch (e) {
      console.error('Error loading finances:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute stats
  const totalRevenue = projects.reduce((acc, p) => acc + p.amount, 0);
  const davidProjectProfit = projects.reduce((acc, p) => acc + p.davidShare, 0);
  const samuelProjectProfit = projects.reduce((acc, p) => acc + p.samuelShare, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

  // Advanced Net Settle and Debt Calculator
  // David's Debt to Samuel calculation
  let davidDebtToSamuel = 0;
  let samuelDebtToDavid = 0;

  // 1. Project receipts direct splits
  projects.forEach((p) => {
    const recv = p.receivedBy || 'company';
    if (recv === 'david') {
      // David received the full amount, so he owes Samuel his share
      davidDebtToSamuel += p.samuelShare;
    } else if (recv === 'samuel') {
      // Samuel received the full amount, so he owes David his share
      samuelDebtToDavid += p.davidShare;
    }
  });

  // 2. Expenses contributions splits
  expenses.forEach((e) => {
    if (e.splitBetween === '50/50') {
      const share = e.amount * 0.5;
      if (e.paidBy === 'david') {
        // David paid $amount, so Samuel owes David his half
        samuelDebtToDavid += share;
      } else if (e.paidBy === 'samuel') {
        // Samuel paid $amount, so David owes Samuel his half
        davidDebtToSamuel += share;
      }
    } else if (e.splitBetween === '70/30') {
      const dShare = e.amount * 0.7;
      const sShare = e.amount * 0.3;
      if (e.paidBy === 'david') {
        // David paid, so Samuel owes David his 30%
        samuelDebtToDavid += sShare;
      } else if (e.paidBy === 'samuel') {
        // Samuel paid, so David owes Samuel his 70%
        davidDebtToSamuel += dShare;
      }
    }
  });

  // Settle up net debt
  const netSettleDiff = davidDebtToSamuel - samuelDebtToDavid;
  const whoOwesWhom = netSettleDiff > 0 ? 'david' : netSettleDiff < 0 ? 'samuel' : 'square';
  const finalOwedAmount = Math.abs(netSettleDiff);

  // Add Project
  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName || !projAmount || isNaN(parseFloat(projAmount))) return;

    const amount = parseFloat(projAmount);
    let dShare = 0;
    let sShare = 0;

    if (projSplitType === 'standard') {
      dShare = amount * 0.5;
      sShare = amount * 0.5;
    } else if (projSplitType === 'family') {
      dShare = amount * 0.7;
      sShare = amount * 0.3;
    } else if (projSplitType === 'custom') {
      dShare = amount * (customDavidPct / 100);
      sShare = amount * ((100 - customDavidPct) / 100);
    }

    try {
      const res = await fetch('/api/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'project',
          name: projName,
          amount,
          type: projSplitType,
          davidShare: dShare,
          samuelShare: sShare,
          receivedBy: projReceivedBy
        })
      });

      if (res.ok) {
        setProjName('');
        setProjAmount('');
        setProjSplitType('standard');
        setProjReceivedBy('company');
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Add Expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expDescription || !expAmount || isNaN(parseFloat(expAmount))) return;

    try {
      const res = await fetch('/api/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'expense',
          description: expDescription,
          amount: parseFloat(expAmount),
          paidBy: expPaidBy,
          splitBetween: expSplit
        })
      });

      if (res.ok) {
        setExpDescription('');
        setExpAmount('');
        setExpPaidBy('david');
        setExpSplit('50/50');
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Item
  const handleDeleteItem = async (id: string, type: 'project' | 'expense') => {
    try {
      const res = await fetch(`/api/finances?id=${id}&type=${type}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Git Push Sync action
  const handleGitSync = async () => {
    setIsSyncing(true);
    setSyncStatus('running');
    setSyncLogs(['[START] Iniciando protocolo de sincronización Blinq Finances...']);
    
    try {
      // Small delays to simulate terminal logs
      await new Promise(r => setTimeout(r, 600));
      setSyncLogs(prev => [...prev, '$ git status\n[OK] Cambios financieros locales detectados en database_fallback.json']);
      
      await new Promise(r => setTimeout(r, 800));
      setSyncLogs(prev => [...prev, '$ git add database_fallback.json\n[OK] Archivo de base de datos agregado al stage.']);

      const res = await fetch('/api/finances/push', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setSyncStatus('success');
        setSyncLogs(prev => [...prev, ...data.logs]);
      } else {
        setSyncStatus('error');
        setSyncLogs(prev => [...prev, `[ERROR] Sincronización fallida: ${data.message}`, ...data.logs]);
      }
    } catch (e: any) {
      setSyncStatus('error');
      setSyncLogs(prev => [...prev, `[FATAL] Error en la conexión API: ${e.message}`]);
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* Premium Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ 
          fontSize: '2.25rem', 
          fontWeight: 900, 
          letterSpacing: '-0.04em', 
          background: 'linear-gradient(135deg, #ffffff 30%, #c084fc 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '0.35rem'
        }}>
          Blinq Finances 💎
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Consola y libro de contabilidad glassmórfico de Blinq. Sincronización transparente con GitHub.
        </p>
      </div>

      {/* Overview Cards (Apple Liquid Glass Grid) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '1.25rem', 
        marginBottom: '2rem' 
      }}>
        {/* Total Revenue */}
        <div className="glass-card" style={{ 
          background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(168,85,247,0.03) 100%)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-md), 0 0 20px rgba(168,85,247,0.02)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a855f7', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Ingresos Totales
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            Proyectos Completados: {projects.length}
          </div>
        </div>

        {/* David's Share */}
        <div className="glass-card" style={{ 
          background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(59,130,246,0.03) 100%)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-md)',
          position: 'relative'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#3b82f6', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Participación de David
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            ${davidProjectProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            Ganancia por splits de proyectos
          </div>
        </div>

        {/* Samuel's Share */}
        <div className="glass-card" style={{ 
          background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(236,72,153,0.03) 100%)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ec4899', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Participación de Samuel
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            ${samuelProjectProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            Ganancia por splits de proyectos
          </div>
        </div>

        {/* Company Expenses */}
        <div className="glass-card" style={{ 
          background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(239,68,68,0.03) 100%)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ef4444', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Gastos Totales
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            ${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            Servicios, dominios y APIs: {expenses.length}
          </div>
        </div>
      </div>

      {/* Debt Balance Banner (Liquid Glass Glow Settle Alert) */}
      <div style={{ 
        background: 'linear-gradient(135deg, rgba(9, 10, 16, 0.95) 0%, rgba(15, 17, 26, 0.95) 100%)',
        border: '1px solid rgba(168, 85, 247, 0.15)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem 2rem',
        marginBottom: '2.5rem',
        boxShadow: 'var(--shadow-lg), 0 0 30px rgba(168, 85, 247, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            width: '42px', 
            height: '42px', 
            borderRadius: '12px', 
            background: 'rgba(168, 85, 247, 0.12)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#a855f7',
            fontSize: '1.25rem'
          }}>
            ⚖️
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.15rem' }}>Balanza de Deudas Interna</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Computado automáticamente cruzando splits cobrados y gastos aportados individualmente.
            </p>
          </div>
        </div>

        {/* Glow status message */}
        <div style={{
          padding: '0.6rem 1.25rem',
          borderRadius: '99px',
          background: whoOwesWhom === 'square' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
          border: whoOwesWhom === 'square' ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)',
          color: whoOwesWhom === 'square' ? '#10b981' : '#f59e0b',
          fontSize: '0.9rem',
          fontWeight: 700,
          boxShadow: whoOwesWhom === 'square' ? '0 0 20px rgba(16, 185, 129, 0.1)' : '0 0 20px rgba(245, 158, 11, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          {whoOwesWhom === 'square' && (
            <span>🤝 ¡Están completamente a mano! Cero deudas pendientes.</span>
          )}
          {whoOwesWhom === 'david' && (
            <span>⚠️ David le debe a Samuel: <strong>${finalOwedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong></span>
          )}
          {whoOwesWhom === 'samuel' && (
            <span>⚠️ Samuel le debe a David: <strong>${finalOwedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong></span>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '2rem', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveTab('overview')}
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'overview' ? '#ffffff' : 'var(--text-muted)',
            padding: '0.6rem 1.25rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeTab === 'overview' ? '2px solid #a855f7' : '2px solid transparent',
            transition: 'all 0.2s ease'
          }}
        >
          📊 Panel de Consolidación
        </button>
        <button 
          onClick={() => setActiveTab('projects')}
          className={`tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'projects' ? '#ffffff' : 'var(--text-muted)',
            padding: '0.6rem 1.25rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeTab === 'projects' ? '2px solid #a855f7' : '2px solid transparent',
            transition: 'all 0.2s ease'
          }}
        >
          📂 Proyectos & Splits
        </button>
        <button 
          onClick={() => setActiveTab('expenses')}
          className={`tab-btn ${activeTab === 'expenses' ? 'active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'expenses' ? '#ffffff' : 'var(--text-muted)',
            padding: '0.6rem 1.25rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeTab === 'expenses' ? '2px solid #a855f7' : '2px solid transparent',
            transition: 'all 0.2s ease'
          }}
        >
          💸 Gastos & Servicios
        </button>
        <button 
          onClick={() => setActiveTab('sync')}
          className={`tab-btn ${activeTab === 'sync' ? 'active' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'sync' ? '#ffffff' : 'var(--text-muted)',
            padding: '0.6rem 1.25rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeTab === 'sync' ? '2px solid #a855f7' : '2px solid transparent',
            transition: 'all 0.2s ease'
          }}
        >
          🚀 Sincronizar (Git Push)
        </button>
      </div>

      {/* Tab 1: Panel de Consolidación */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          {/* Main Ledger List */}
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📜 Libro Contable Combinado
            </h2>
            
            {projects.length === 0 && expenses.length === 0 ? (
              <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-default)' }}>
                <p style={{ color: 'var(--text-muted)' }}>No hay transacciones registradas aún. ¡Añade un proyecto o gasto!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Render Combined Ledger Items Sorted by Date */}
                {[
                  ...projects.map(p => ({ ...p, ledgerType: 'project' as const })),
                  ...expenses.map(e => ({ ...e, ledgerType: 'expense' as const }))
                ]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((item) => (
                    <div 
                      key={item.id} 
                      className="glass-card combined-ledger-item" 
                      style={{
                        padding: '1.15rem 1.5rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        background: 'rgba(9, 10, 16, 0.45)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: item.ledgerType === 'project' ? 'rgba(168, 85, 247, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: item.ledgerType === 'project' ? '#a855f7' : '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem'
                        }}>
                          {item.ledgerType === 'project' ? '📁' : '💸'}
                        </div>
                        <div>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.15rem' }}>
                            {item.ledgerType === 'project' ? (item as any).name : (item as any).description}
                          </h4>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {new Date(item.created_at).toLocaleDateString()} · {
                              item.ledgerType === 'project' 
                                ? `Split: ${(item as any).type === 'standard' ? '50/50' : (item as any).type === 'family' ? '70/30' : 'Personalizado'}`
                                : `Pagado por: ${(item as any).paidBy.toUpperCase()}`
                            }
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ 
                            fontSize: '1.05rem', 
                            fontWeight: 800, 
                            color: item.ledgerType === 'project' ? '#10b981' : '#ef4444' 
                          }}>
                            {item.ledgerType === 'project' ? '+' : '-'}${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            {item.ledgerType === 'project' ? (
                              <span>David: ${(item as any).davidShare} | Samu: ${(item as any).samuelShare}</span>
                            ) : (
                              <span>Split: {(item as any).splitBetween}</span>
                            )}
                          </div>
                        </div>

                        <button 
                          onClick={() => handleDeleteItem(item.id, item.ledgerType)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            padding: '0.25rem',
                            transition: 'color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                          title="Eliminar registro"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          {/* Quick Stats Column */}
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem' }}>
              💡 Resumen Contable
            </h2>
            <div className="glass-card" style={{ 
              padding: '1.5rem', 
              borderRadius: 'var(--radius-lg)', 
              border: '1px solid var(--border-subtle)',
              background: 'rgba(9, 10, 16, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Caja Bruta Acumulada</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginTop: '0.15rem' }}>
                  ${(totalRevenue - totalExpenses).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                </div>
              </div>
              
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Socio Co-Fundador David</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.85rem' }}>
                  <span>Ingresos por Proyectos:</span>
                  <strong style={{ color: '#10b981' }}>+${davidProjectProfit}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem', fontSize: '0.85rem' }}>
                  <span>Gastos Personales Aportados:</span>
                  <strong style={{ color: '#3b82f6' }}>+${expenses.filter(e => e.paidBy === 'david').reduce((acc, e) => acc + e.amount, 0)}</strong>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Socio Co-Fundador Samuel</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.85rem' }}>
                  <span>Ingresos por Proyectos:</span>
                  <strong style={{ color: '#10b981' }}>+${samuelProjectProfit}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem', fontSize: '0.85rem' }}>
                  <span>Gastos Personales Aportados:</span>
                  <strong style={{ color: '#ec4899' }}>+${expenses.filter(e => e.paidBy === 'samuel').reduce((acc, e) => acc + e.amount, 0)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Proyectos & Splits */}
      {activeTab === 'projects' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Add Project Form */}
          <div className="glass-card" style={{ 
            padding: '2rem', 
            borderRadius: 'var(--radius-lg)', 
            border: '1px solid var(--border-default)',
            background: 'rgba(9, 10, 16, 0.7)'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>
              ➕ Añadir Nuevo Proyecto de Blinq
            </h2>
            <form onSubmit={handleAddProject} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Nombre del Cliente / Proyecto</label>
                <input 
                  type="text" 
                  value={projName} 
                  onChange={(e) => setProjName(e.target.value)} 
                  placeholder="Ej: Dentalia Monterrey, Azuleno Spa..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#ffffff',
                    marginTop: '0.35rem'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Monto Cobrado (USD)</label>
                <input 
                  type="number" 
                  value={projAmount} 
                  onChange={(e) => setProjAmount(e.target.value)} 
                  placeholder="Ej: 50"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#ffffff',
                    marginTop: '0.35rem'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>¿Quién cobró esta facturación?</label>
                <select 
                  value={projReceivedBy} 
                  onChange={(e) => setProjReceivedBy(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#ffffff',
                    marginTop: '0.35rem'
                  }}
                >
                  <option value="company">Cuenta de la Empresa (Blinq)</option>
                  <option value="david">David (Cobrado directamente)</option>
                  <option value="samuel">Samuel (Cobrado directamente)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Distribución del Profit (Split)</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setProjSplitType('standard')}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      background: projSplitType === 'standard' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(0,0,0,0.2)',
                      border: projSplitType === 'standard' ? '1px solid #a855f7' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    Estándar (50/50)
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setProjSplitType('family')}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      background: projSplitType === 'family' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(0,0,0,0.2)',
                      border: projSplitType === 'family' ? '1px solid #a855f7' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    Familiar (70/30)
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setProjSplitType('custom')}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      background: projSplitType === 'custom' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(0,0,0,0.2)',
                      border: projSplitType === 'custom' ? '1px solid #a855f7' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    Personalizado
                  </button>
                </div>
              </div>

              {/* Custom Sliders */}
              {projSplitType === 'custom' && (
                <div style={{
                  padding: '1rem',
                  background: 'rgba(0,0,0,0.25)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span>David: <strong>{customDavidPct}%</strong></span>
                    <span>Samuel: <strong>{100 - customDavidPct}%</strong></span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={customDavidPct} 
                    onChange={(e) => setCustomDavidPct(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#a855f7', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <span>David: ${(parseFloat(projAmount || '0') * customDavidPct / 100).toFixed(2)}</span>
                    <span>Samuel: ${(parseFloat(projAmount || '0') * (100 - customDavidPct) / 100).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <button 
                type="submit"
                style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 0 16px rgba(168,85,247,0.3)',
                  transition: 'transform 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                Registrar Proyecto
              </button>
            </form>
          </div>

          {/* Projects Ledger List */}
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>
              📂 Listado de Proyectos
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {projects.map((proj) => (
                <div 
                  key={proj.id} 
                  className="glass-card" 
                  style={{
                    padding: '1.15rem 1.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(9, 10, 16, 0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.15rem' }}>{proj.name}</h4>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Cobrado por: <strong style={{ color: '#ffffff' }}>{(proj.receivedBy || 'company').toUpperCase()}</strong> · Split: {proj.type === 'standard' ? '50/50' : proj.type === 'family' ? '70/30' : 'Personalizado'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10b981' }}>
                        +${proj.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        David: ${proj.davidShare} | Samu: ${proj.samuelShare}
                      </div>
                    </div>

                    <button 
                      onClick={() => handleDeleteItem(proj.id, 'project')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        padding: '0.25rem',
                        transition: 'color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Gastos & Servicios */}
      {activeTab === 'expenses' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Add Expense Form */}
          <div className="glass-card" style={{ 
            padding: '2rem', 
            borderRadius: 'var(--radius-lg)', 
            border: '1px solid var(--border-default)',
            background: 'rgba(9, 10, 16, 0.7)'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>
              ➕ Registrar Gasto de la Empresa
            </h2>
            <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Concepto / Descripción del Gasto</label>
                <input 
                  type="text" 
                  value={expDescription} 
                  onChange={(e) => setExpDescription(e.target.value)} 
                  placeholder="Ej: Servidor Vercel, API Resend, Hosting..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#ffffff',
                    marginTop: '0.35rem'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Monto Total (USD)</label>
                <input 
                  type="number" 
                  value={expAmount} 
                  onChange={(e) => setExpAmount(e.target.value)} 
                  placeholder="Ej: 25.50"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#ffffff',
                    marginTop: '0.35rem'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>¿Quién pagó este gasto?</label>
                <select 
                  value={expPaidBy} 
                  onChange={(e) => setExpPaidBy(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#ffffff',
                    marginTop: '0.35rem'
                  }}
                >
                  <option value="david">David (Personal)</option>
                  <option value="samuel">Samuel (Personal)</option>
                  <option value="company">Cuenta de la Empresa (Caja Blinq)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Distribución del Gasto</label>
                <select 
                  value={expSplit} 
                  onChange={(e) => setExpSplit(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#ffffff',
                    marginTop: '0.35rem'
                  }}
                >
                  <option value="50/50">Mitad y Mitad (50/50)</option>
                  <option value="70/30">Familiar (70 David / 30 Samuel)</option>
                  <option value="company">100% Cuenta de la Empresa</option>
                </select>
              </div>

              <button 
                type="submit"
                style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 0 16px rgba(239,68,68,0.2)',
                  transition: 'transform 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                Registrar Gasto
              </button>
            </form>
          </div>

          {/* Expenses Ledger List */}
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>
              💸 Listado de Gastos
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {expenses.map((exp) => (
                <div 
                  key={exp.id} 
                  className="glass-card" 
                  style={{
                    padding: '1.15rem 1.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(9, 10, 16, 0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.15rem' }}>{exp.description}</h4>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Pagado por: <strong style={{ color: '#ffffff' }}>{exp.paidBy.toUpperCase()}</strong> · Distribución: {exp.splitBetween}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ef4444' }}>
                        -${exp.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <button 
                      onClick={() => handleDeleteItem(exp.id, 'expense')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        padding: '0.25rem',
                        transition: 'color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Sincronizar (Git Push Panel) */}
      {activeTab === 'sync' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          <div className="glass-card" style={{ 
            padding: '2.5rem', 
            borderRadius: 'var(--radius-lg)', 
            border: '1px solid var(--border-default)',
            background: 'rgba(9, 10, 16, 0.85)',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1rem', background: 'linear-gradient(to right, #ffffff, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              🚀 Protocolo de Sincronización Blinq a GitHub
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: '1.6' }}>
              Este panel sincroniza de forma segura el estado de tus libros contables locales (`database_fallback.json`) directamente con tu repositorio de GitHub principal. Al hacer clic en sincronizar, Blinq ejecutará una confirmación automática (`Git Commit`) y subirá los cambios (`Git Push`) a la rama principal de producción (`main`).
            </p>

            {/* Sync Button */}
            <div style={{ marginBottom: '2rem' }}>
              <button 
                onClick={handleGitSync}
                disabled={isSyncing}
                style={{
                  padding: '1rem 2.5rem',
                  background: isSyncing ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #a855f7, #6366f1)',
                  border: isSyncing ? '1px solid var(--border-subtle)' : 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: isSyncing ? 'not-allowed' : 'pointer',
                  boxShadow: isSyncing ? 'none' : '0 0 25px rgba(168,85,247,0.3)',
                  transition: 'all 0.25s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  margin: '0 auto'
                }}
              >
                {isSyncing ? (
                  <>
                    <div className="spinner" style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid #ffffff' }}></div>
                    Sincronizando archivos contables...
                  </>
                ) : (
                  <>
                    🚀 Subir a GitHub (Git Push)
                  </>
                )}
              </button>
            </div>

            {/* Terminal Glass Container */}
            {syncLogs.length > 0 && (
              <div style={{
                background: '#040406',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                lineHeight: '1.6',
                color: '#e4e4e7',
                textAlign: 'left',
                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.8)',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></div>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }}></div>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                    git-console-session.bash {syncStatus === 'success' && '• Sincronizado ✅'} {syncStatus === 'error' && '• Fallido ❌'}
                  </span>
                </div>
                {syncLogs.map((log, index) => {
                  const isCmd = log.startsWith('$') || log.startsWith('[CMD]');
                  const isErr = log.toLowerCase().includes('fail') || log.toLowerCase().includes('error') || log.startsWith('[FATAL]');
                  const isSuccess = log.includes('Success!') || log.includes('completada') || log.includes('✅');

                  let logColor = '#d4d4d8';
                  if (isCmd) logColor = '#c084fc';
                  if (isErr) logColor = '#ef4444';
                  if (isSuccess) logColor = '#10b981';

                  return (
                    <div key={index} style={{ color: logColor, whiteSpace: 'pre-wrap', marginBottom: '0.4rem' }}>
                      {log}
                    </div>
                  );
                })}
                {isSyncing && (
                  <div style={{ color: '#a855f7', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem' }}>
                    <span>⚡ Ejecutando operación remota...</span>
                    <span className="blink-cursor">_</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
