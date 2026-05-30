'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  TrendingUp,
  Award,
  Sparkles,
  Zap,
  Activity,
  DollarSign,
  Phone,
  MapPin,
  ChevronRight,
  BookOpen,
  HelpCircle,
  AlertCircle,
  Calculator,
  Search,
  MessageSquare
} from 'lucide-react';

interface Partner {
  id: string;
  name: string;
  label: string;
  phone: string;
  whatsapp_url: string;
  avatar_color: string;
  referredCount: number;
  wonCount: number;
  activeCount: number;
  commission: {
    usd: number;
    cop: number;
  };
}

interface ReferredLead {
  lead_id: string;
  business_name: string;
  website: string;
  city: string;
  crm_status: string;
  crm_notes: string;
  referred_by: string | null;
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [leads, setLeads] = useState<ReferredLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'calc' | 'workflow' | 'networks' | 'steps'>('calc');
  const [searchQuery, setSearchQuery] = useState('');

  // Interactive Profit Calculator States
  const [currency, setCurrency] = useState<'USD' | 'COP'>('USD');
  const [clientPrice, setClientPrice] = useState<number>(120);
  const [selectedPlan, setSelectedPlan] = useState<'ignition' | 'growth' | 'scale'>('ignition');

  const plans = {
    USD: {
      ignition: { name: 'Protocol Ignition', baseCost: 50, avgPrice: 120 },
      growth: { name: 'System Growth', baseCost: 200, avgPrice: 350 },
      scale: { name: 'Digital Scale', baseCost: 500, avgPrice: 800 }
    },
    COP: {
      ignition: { name: 'Protocol Ignition', baseCost: 200000, avgPrice: 400000 },
      growth: { name: 'System Growth', baseCost: 800000, avgPrice: 1400000 },
      scale: { name: 'Digital Scale', baseCost: 2000000, avgPrice: 3200000 }
    }
  };

  useEffect(() => {
    // Sync average prices when currency or plan changes
    const currentConfig = plans[currency][selectedPlan];
    setClientPrice(currentConfig.avgPrice);
  }, [currency, selectedPlan]);

  const loadPartnersData = async () => {
    try {
      setLoading(true);
      // Fetch partners stats
      const partnersRes = await fetch('/api/partners');
      const partnersData = await partnersRes.json();
      if (Array.isArray(partnersData)) {
        setPartners(partnersData);
      }

      // Fetch leads to display in referral table
      const leadsRes = await fetch('/api/leads');
      const leadsData = await leadsRes.json();
      if (Array.isArray(leadsData)) {
        setLeads(leadsData.filter(l => l.referred_by !== null));
      }
    } catch (e) {
      console.error('Error fetching partners dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPartnersData();
  }, []);

  // Calculator computations
  const currentBaseCost = plans[currency][selectedPlan].baseCost;
  const partnerProfit = Math.max(0, clientPrice - currentBaseCost);
  const profitMargin = clientPrice > 0 ? ((partnerProfit / clientPrice) * 100).toFixed(0) : '0';

  // Stats aggregates
  const totalPartners = partners.length;
  const totalReferrals = partners.reduce((sum, p) => sum + p.referredCount, 0);
  const totalWon = partners.reduce((sum, p) => sum + p.wonCount, 0);
  
  const totalCommissionUSD = partners.reduce((sum, p) => sum + p.commission.usd, 0);
  const totalCommissionCOP = partners.reduce((sum, p) => sum + p.commission.cop, 0);

  const filteredPartners = partners.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="stagger-children sapphire-body-overlay">
      {/* ── Header Section ── */}
      <header style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#a855f7', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
          <Award width={13} height={13} className="animate-pulse" /> Blinq Partners Program
        </div>
        <h1 className="sapphire-greeting-title">Panel de Afiliados</h1>
        <h2 className="sapphire-greeting-subtitle" style={{ maxWidth: '750px' }}>
          Monitorea tus socios estratégicos, comisiones y conversiones en tiempo real en base a nuestro modelo de libre fijación de precios.
        </h2>
      </header>

      {/* ── KPI Grid ── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
        {[
          { label: 'Partners Activos', value: totalPartners, sub: 'WhatsApp Seeds', icon: <Users width={14} height={14} />, color: '#a855f7' },
          { label: 'Leads Referidos', value: totalReferrals, sub: 'Prospección en Pipeline', icon: <TrendingUp width={14} height={14} />, color: '#3b82f6' },
          { label: 'Clientes Won (Cerrados)', value: totalWon, sub: 'Conversiones Blinq', icon: <Sparkles width={14} height={14} />, color: '#10b981' },
          { 
            label: 'Comisiones Pagadas', 
            value: `$${totalCommissionUSD} USD`, 
            sub: `+ ${totalCommissionCOP.toLocaleString('es-ES')} COP`, 
            icon: <DollarSign width={14} height={14} />, 
            color: '#f59e0b' 
          }
        ].map((kpi, idx) => (
          <div key={idx} className="sapphire-kpi" style={{ padding: '1.5rem 1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div className="sapphire-kpi-icon" style={{ color: kpi.color, background: 'rgba(255, 255, 255, 0.03)' }}>
                {kpi.icon}
              </div>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{kpi.label}</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginTop: '0.2rem', lineHeight: '1.1' }}>{kpi.value}</span>
            <span style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.3)', marginTop: '0.35rem', display: 'block' }}>{kpi.sub}</span>
          </div>
        ))}
      </section>

      {/* ── Main Layout: Partners Grid & PDF Guide Calculator ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.7fr', gap: '1.5rem', alignItems: 'start', marginBottom: '2.5rem' }}>
        
        {/* Left Column: Partners roster */}
        <section className="sapphire-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users width={16} height={16} style={{ color: '#a855f7' }} /> Roster de Partners
            </h3>
            <div style={{ position: 'relative', width: '150px' }}>
              <input 
                type="text" 
                placeholder="Buscar..."
                className="form-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: '0.3rem 0.5rem 0.3rem 1.6rem', fontSize: '0.72rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}
              />
              <Search width={11} height={11} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '480px', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="pulse-loading" style={{ height: '110px', borderRadius: '12px' }} />
              ))
            ) : filteredPartners.map((partner) => {
              const initials = partner.name.split(' ').map(n => n[0]).join('').substring(0, 2);
              const conversion = partner.referredCount > 0 
                ? ((partner.wonCount / partner.referredCount) * 100).toFixed(0) 
                : '0';

              return (
                <div 
                  key={partner.id} 
                  className="card card-flat" 
                  style={{ 
                    padding: '1rem', 
                    background: 'rgba(20, 20, 30, 0.4)', 
                    border: '1px solid rgba(255,255,255,0.03)', 
                    borderRadius: '12px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div 
                      style={{ 
                        width: '38px', 
                        height: '38px', 
                        borderRadius: '10px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontWeight: 700, 
                        fontSize: '0.85rem',
                        color: '#ffffff',
                        background: `radial-gradient(circle at 10% 20%, hsla(${partner.avatar_color} / 0.8) 0%, hsla(250, 89%, 67%, 0.4) 90%)`,
                        boxShadow: `0 0 10px hsla(${partner.avatar_color} / 0.15)`
                      }}
                    >
                      {initials}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{partner.name}</h4>
                      <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{partner.label}</p>
                    </div>
                    
                    <a 
                      href={partner.whatsapp_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn-icon" 
                      style={{ marginLeft: 'auto', padding: '0.4rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.15)', borderRadius: '8px' }}
                      title={`Enviar WhatsApp a ${partner.name}`}
                    >
                      <Phone width={12} height={12} />
                    </a>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', background: 'rgba(0,0,0,0.15)', padding: '0.5rem', borderRadius: '8px', fontSize: '0.7rem', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <div>
                      <div style={{ color: 'rgba(255,255,255,0.3)' }}>Referidos</div>
                      <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.8rem', marginTop: '0.1rem' }}>{partner.referredCount}</div>
                    </div>
                    <div>
                      <div style={{ color: 'rgba(255,255,255,0.3)' }}>Tasa Cierre</div>
                      <div style={{ fontWeight: 700, color: '#10b981', fontSize: '0.8rem', marginTop: '0.1rem' }}>{conversion}%</div>
                    </div>
                    <div>
                      <div style={{ color: 'rgba(255,255,255,0.3)' }}>Comisión</div>
                      <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.8rem', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {partner.commission.usd > 0 ? `$${partner.commission.usd}` : partner.commission.cop > 0 ? `${(partner.commission.cop/1000)}k COP` : '$0'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {!loading && filteredPartners.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                No se encontraron afiliados que coincidan con tu búsqueda.
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Blinq Partners Interactive Guide Tabs */}
        <section className="sapphire-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '562px' }}>
          {/* Tab Navigation header */}
          <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.25)', padding: '0.35rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
            {[
              { id: 'calc', label: 'Calculadora', icon: <Calculator width={12} height={12} /> },
              { id: 'workflow', label: '3 Pasos', icon: <Zap width={12} height={12} /> },
              { id: 'networks', label: '¿Dónde Buscar?', icon: <BookOpen width={12} height={12} /> },
              { id: 'steps', label: 'Guía de Acción', icon: <HelpCircle width={12} height={12} /> }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  padding: '0.5rem 0.25rem',
                  borderRadius: '7px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  outline: 'none',
                  transition: 'all 0.25s ease',
                  background: activeTab === tab.id ? 'linear-gradient(135deg, #a855f7, #6366f1)' : 'transparent',
                  color: activeTab === tab.id ? '#ffffff' : 'rgba(255,255,255,0.45)'
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab 1: Profit Calculator */}
          {activeTab === 'calc' && (
            <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff' }}>Tu Ganancia, Tu Regla 💸</h4>
                  <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.1rem' }}>
                    Blinq cobra una tarifa fija. Tú cobras lo que desees al cliente final y te quedas con el 100% de la diferencia.
                  </p>
                </div>
                {/* Currency toggler */}
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.2rem' }}>
                  {(['USD', 'COP'] as const).map(curr => (
                    <button
                      key={curr}
                      onClick={() => setCurrency(curr)}
                      style={{
                        padding: '0.25rem 0.6rem',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        border: 'none',
                        outline: 'none',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        background: currency === curr ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                        color: currency === curr ? '#a855f7' : 'rgba(255,255,255,0.3)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selectors Plans */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                {(['ignition', 'growth', 'scale'] as const).map(planKey => {
                  const details = plans[currency][planKey];
                  const isSelected = selectedPlan === planKey;
                  return (
                    <div 
                      key={planKey}
                      onClick={() => setSelectedPlan(planKey)}
                      style={{
                        padding: '0.85rem 0.65rem',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        border: isSelected ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(255,255,255,0.03)',
                        background: isSelected ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(99, 102, 241, 0.04))' : 'rgba(0,0,0,0.15)',
                        boxShadow: isSelected ? '0 0 15px rgba(168, 85, 247, 0.1)' : 'none',
                        transition: 'all 0.3s ease',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: isSelected ? '#a855f7' : 'rgba(255,255,255,0.35)', letterSpacing: '0.05em' }}>
                        {planKey}
                      </div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#ffffff', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {details.name}
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#a855f7', marginTop: '0.35rem' }}>
                        {currency === 'USD' ? `$${details.baseCost}` : `${(details.baseCost/1000)}k COP`}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.1rem' }}>Costo Blinq</div>
                    </div>
                  );
                })}
              </div>

              {/* Sliding price editor */}
              <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>Precio Sugerido al Cliente Final</span>
                  <span style={{ color: '#ffffff', fontWeight: 700 }}>
                    {currency === 'USD' ? `$${clientPrice}` : `${clientPrice.toLocaleString('es-ES')} COP`}
                  </span>
                </div>

                <input 
                  type="range"
                  min={plans[currency][selectedPlan].baseCost}
                  max={plans[currency][selectedPlan].baseCost * (currency === 'USD' ? 4 : 3)}
                  step={currency === 'USD' ? 5 : 50000}
                  value={clientPrice}
                  onChange={(e) => setClientPrice(parseInt(e.target.value, 10))}
                  style={{
                    width: '100%',
                    accentColor: '#a855f7',
                    background: 'rgba(255,255,255,0.05)',
                    height: '5px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    outline: 'none',
                    margin: '0.5rem 0 1rem 0'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', color: 'rgba(255,255,255,0.3)' }}>
                  <span>Min: {currency === 'USD' ? `$${plans[currency][selectedPlan].baseCost}` : `${plans[currency][selectedPlan].baseCost.toLocaleString('es-ES')} COP`}</span>
                  <span>Max: {currency === 'USD' ? `$${plans[currency][selectedPlan].baseCost * 3}` : `${(plans[currency][selectedPlan].baseCost * 3).toLocaleString('es-ES')} COP`}</span>
                </div>
              </div>

              {/* Profit Output Panel */}
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '1.25rem', 
                  borderRadius: '14px', 
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(0, 0, 0, 0.4))',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  boxShadow: '0 4px 30px rgba(16, 185, 129, 0.05)'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tu Margen Estimado</div>
                  <div style={{ fontSize: '2rem', fontWeight: 950, color: '#ffffff', letterSpacing: '-0.03em', marginTop: '0.15rem' }}>
                    {currency === 'USD' ? `$${partnerProfit} USD` : `${partnerProfit.toLocaleString('es-ES')} COP`}
                  </div>
                  <div style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.2rem' }}>
                    Fórmula: Cliente ({currency === 'USD' ? `$${clientPrice}` : `${(clientPrice/1000)}k`}) - Blinq ({currency === 'USD' ? `$${currentBaseCost}` : `${(currentBaseCost/1000)}k`})
                  </div>
                </div>

                <div 
                  style={{ 
                    width: '68px', 
                    height: '68px', 
                    borderRadius: '50%', 
                    border: '3px solid #10b981', 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: 'rgba(16, 185, 129, 0.1)',
                    boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)'
                  }}
                >
                  <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>{profitMargin}%</span>
                  <span style={{ fontSize: '0.52rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.1rem' }}>Margen</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Timeline Workflow */}
          {activeTab === 'workflow' && (
            <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff' }}>Cómo Funciona en 3 Pasos ⚡</h4>
                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.1rem' }}>
                  Un flujo simple diseñado para que conectes negocios locales con tecnología y generes ingresos.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingLeft: '0.75rem', position: 'relative' }}>
                {/* Vertical timeline line bar */}
                <div style={{ position: 'absolute', left: '16px', top: '15px', bottom: '15px', width: '2px', background: 'linear-gradient(to bottom, #a855f7, #6366f1)', opacity: 0.25 }} />

                {[
                  { step: '1', title: 'Consigues un Cliente Interesado', desc: 'Identifica a un dueño de negocio que no tenga página web o tenga un diseño lento/desactualizado que afecte sus ventas móviles.' },
                  { step: '2', title: 'Lo Conectas con Blinq', desc: 'Compártenos su contacto o crea una conexión directa en WhatsApp. Blinq se encargará de realizar toda la consultoría, diseño, código y entrega.' },
                  { step: '3', title: 'Cobras tu Precio Base Fijo', desc: 'Cobras la tarifa libre acordada con tu cliente, nos transfieres nuestro costo base del plan y tú te quedas instantáneamente con el 100% de la ganancia.' }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '1.25rem', position: 'relative' }}>
                    <div 
                      style={{ 
                        width: '20px', 
                        height: '20px', 
                        borderRadius: '50%', 
                        background: 'linear-gradient(135deg, #a855f7, #6366f1)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: '#ffffff', 
                        fontWeight: 800, 
                        fontSize: '0.75rem',
                        boxShadow: '0 0 10px rgba(168, 85, 247, 0.4)',
                        flexShrink: 0,
                        zIndex: 2,
                        marginTop: '0.15rem'
                      }}
                    >
                      {item.step}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <h5 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>{item.title}</h5>
                      <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Sourcing Networks */}
          {activeTab === 'networks' && (
            <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff' }}>Tu red ya vale dinero 🌐</h4>
                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.1rem' }}>
                  Cada persona que conoces o negocio que frecuentas es un cliente potencial directo para ofrecerle una renovación digital.
                </p>
              </div>

              {/* Grid 6 columns networks */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
                {[
                  { name: 'Compañeros de trabajo', text: 'Tienen emprendimientos o trabajan en pymes sin soporte web.' },
                  { name: 'Amigos & Conocidos', text: 'Tu círculo más cercano con ideas de negocio y poca presencia.' },
                  { name: 'Familia con Negocio', text: 'Tíos o primos con locales físicos que requieren digitalizarse.' },
                  { name: 'WhatsApp & Contactos', text: 'Restaurantes, barberías o profesionales que ya conoces.' },
                  { name: 'Negocios Locales', text: 'Tiendas, peluquerías o spas de tu vecindario que visitas.' },
                  { name: 'LinkedIn & Redes', text: 'Pymes y autónomos en Instagram que captan leads sin web.' }
                ].map((net, idx) => (
                  <div 
                    key={idx}
                    style={{
                      padding: '0.65rem 0.8rem',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid rgba(255,255,255,0.03)',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#a855f7' }} />
                      {net.name}
                    </div>
                    <p style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.38)', marginTop: '0.2rem', lineHeight: '1.3' }}>{net.text}</p>
                  </div>
                ))}
              </div>

              {/* TIP PRO GLOWING BOX */}
              <div 
                className="animate-pulse"
                style={{ 
                  padding: '0.85rem 1rem', 
                  borderRadius: '10px', 
                  border: '1px solid rgba(16, 185, 129, 0.3)', 
                  background: 'rgba(16, 185, 129, 0.04)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.6rem',
                  marginTop: '0.25rem'
                }}
              >
                <AlertCircle width={15} height={15} style={{ color: '#10b981', flexShrink: 0, marginTop: '0.1rem' }} />
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tip Pro: </span>
                  <span style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.4 }}>
                    Busca negocios que ya estén activos en redes sociales pero sin web propia. Son los más fáciles de convencer porque ya entienden el valor comercial del marketing digital.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Guide Action */}
          {activeTab === 'steps' && (
            <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff' }}>Tu Guía de Acción Rápida 📋</h4>
                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.1rem' }}>
                  Sigue estos cinco pasos secuenciales hoy mismo para asegurar tu primer cierre como partner.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {[
                  { id: '1', badge: 'IDENTIFICA', title: 'Encuentra a alguien que necesite presencia web', text: 'Busca en Google Maps spas, dentistas o barberías con webs lentas (>4.1s) o sin soporte responsive.' },
                  { id: '2', badge: 'CONVERSA', title: 'Habla de manera casual y honesta', text: 'No hace falta ser técnico. Di: "Conozco una agencia que hace webs móviles increíbles en 48 horas por $50 USD. ¿Quieres ver un boceto gratis?"' },
                  { id: '3', badge: 'CONECTA', title: 'Ponlos en contacto con el equipo de Blinq', text: 'Pásales nuestro link o dile que nos escriba a WhatsApp. Nosotros hacemos la consultoría y la entrega sin costo de anticipo.' },
                  { id: '4', badge: 'COBRA', title: 'Asegura tu comisión de forma directa', text: 'Acuerda tu precio final con el cliente ANTES, cobra tu parte (efectivo/transferencia) y transfiérenos el costo base del plan.' },
                  { id: '5', badge: 'REPITE', title: 'Genera un flujo de ingresos constante', text: 'Un cliente satisfecho te referirá más. Vuelve a tu lista de contactos para continuar el flujo de ingresos.' }
                ].map((step, idx) => (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.5rem 0.65rem',
                      background: 'rgba(0, 0, 0, 0.15)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.52rem', fontWeight: 800, padding: '0.1rem 0.35rem', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
                        {step.badge}
                      </span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'rgba(255, 255, 255, 0.15)' }}>{step.id}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <h5 style={{ fontSize: '0.74rem', fontWeight: 700, color: '#ffffff' }}>{step.title}</h5>
                      <p style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.1rem', lineHeight: '1.3' }}>{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </section>

      </div>

      {/* ── Referred Leads active table tracker ledger ── */}
      <section className="sapphire-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap width={16} height={16} style={{ color: '#10b981' }} /> Registro de Referidos Activos
          </h3>
          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
            Se actualiza automáticamente al cambiar de estados en el pipeline principal
          </span>
        </div>

        <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)', background: 'rgba(10,10,16,0.3)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {['Prospecto', 'Afiliado Referidor', 'Ubicación', 'Estatus CRM', 'Plan Blinq Base', 'Comisión Estimada'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }} className="pulse-loading">
                    Cargando leads referidos...
                  </td>
                </tr>
              ) : leads.map((lead, idx) => {
                const partnerName = partners.find(p => p.id === lead.referred_by)?.name || 'Afiliado';
                const statusColor = 
                  lead.crm_status === 'won' ? '#10b981' :
                  lead.crm_status === 'replied' ? '#f59e0b' :
                  lead.crm_status === 'contacted' ? '#3b82f6' :
                  'rgba(255,255,255,0.5)';
                
                const statusEmoji = 
                  lead.crm_status === 'won' ? '🏆' :
                  lead.crm_status === 'replied' ? '🔥' :
                  lead.crm_status === 'contacted' ? '📧' :
                  '🔍';

                // Parse commission representation
                let commissionText = '—';
                if (lead.crm_status === 'won') {
                  const notes = lead.crm_notes || '';
                  const usdMatch = notes.match(/comisión\s*\$?(\d+)\s*usd/i);
                  const copMatch = notes.match(/comisión\s*\$?([\d\.]+)\s*cop/i);

                  if (usdMatch) {
                    commissionText = `$${usdMatch[1]} USD`;
                  } else if (copMatch) {
                    commissionText = `${copMatch[1]} COP`;
                  } else {
                    const isCop = (lead.city || '').toLowerCase().includes('bogotá') || (lead.city || '').toLowerCase().includes('colombia');
                    commissionText = isCop ? '200.000 COP' : '$70 USD';
                  }
                }

                return (
                  <tr 
                    key={lead.lead_id}
                    style={{ 
                      borderBottom: '1px solid rgba(255,255,255,0.02)', 
                      background: idx % 2 === 0 ? 'rgba(255,255,255,0.005)' : 'transparent',
                      transition: 'background 0.2s ease'
                    }}
                    className="lead-table-row"
                  >
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: '#ffffff' }}>{lead.business_name}</span>
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.68rem', color: '#3b82f6', textDecoration: 'underline', width: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {lead.website.replace('https://', '').replace('http://', '').replace('www.', '')}
                        </a>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 500, color: '#ffffff' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a855f7' }} />
                        {partnerName}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.45)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <MapPin width={10} height={10} /> {lead.city}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ color: statusColor, fontWeight: 700, fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {statusEmoji} {
                          lead.crm_status === 'won' ? 'Cliente Blinq' :
                          lead.crm_status === 'replied' ? 'Respondió' :
                          lead.crm_status === 'contacted' ? 'Contactado' :
                          'Rastreado'
                        }
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                      {lead.crm_status === 'won' ? (
                        <span style={{ fontSize: '0.7rem', color: '#a855f7', background: 'rgba(168, 85, 247, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(168, 85, 247, 0.15)' }}>
                          Ignition (Base Cost)
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#f59e0b', fontWeight: 700 }}>
                      {commissionText}
                    </td>
                  </tr>
                );
              })}

              {!loading && leads.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem' }}>
                    No hay referidos registrados todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
