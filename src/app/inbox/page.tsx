'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import { 
  Mail, 
  Phone, 
  Globe, 
  AlertTriangle, 
  Send, 
  Check, 
  Copy, 
  ExternalLink,
  MessageSquare,
  Sparkles,
  Search,
  CheckCircle2,
  Trash2
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
  address: string | null;
  google_rating: number | null;
  website_issues: string[];
  campaign_id: string;
  niche: string;
  city: string;
  draft_id: string | null;
  subject: string | null;
  pitch_email: string;
  pitch_dm: string;
  draft_status: 'pending_review' | 'approved' | 'rejected' | 'sent';
  contact_channel: 'email' | 'instagram' | 'whatsapp';
  sent_at: string | null;
}

export default function Inbox() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState<'email' | 'dm'>('email');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit states for draft
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editDm, setEditDm] = useState('');

  // Status/feedback indicators
  const [sendLoading, setSendLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function loadLeads() {
      try {
        const res = await fetch('/api/leads');
        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          setLeads(data);
          setSelectedLead(data[0]);
        } else {
          // BEAUTIFUL INTERACTIVE DEMO LEADS
          // Allows instant testing of the UI and copy functionalities
          const mockLeads: Lead[] = [
            {
              lead_id: 'mock-1',
              business_name: 'DentaCare Monterrey',
              phone: '+52 81 1234 5678',
              email: 'contacto@dentacare.com.mx',
              website: 'https://dentacare.com.mx',
              has_website: true,
              instagram: 'https://instagram.com/dentacare_mty',
              whatsapp: 'https://wa.me/528112345678',
              address: 'Av. Constitución 402, Monterrey',
              google_rating: 4.2,
              website_issues: ['Tiempo de carga lento (>4s)', 'No está optimizado para dispositivos móviles', 'Falta etiqueta Meta Title (SEO básico)'],
              campaign_id: 'camp-1',
              niche: 'Dentistas',
              city: 'Monterrey, MX',
              draft_id: 'draft-1',
              subject: 'Idea rápida para mejorar el sitio móvil de DentaCare',
              pitch_email: `Hola DentaCare,\n\nEstaba buscando dentistas en Monterrey y me encontré con su perfil. Tienen excelentes reseñas, pero al visitar dentacare.com.mx desde mi celular noté que tarda más de 4 segundos en cargar y algunos botones de reserva de citas se cortan en la pantalla.\n\nEn Blinq (blinqoficial.com) nos dedicamos a hacer páginas web premium que cargan al instante. Se me ocurrió diseñar un boceto visual rápido en Figma de cómo se vería una versión móvil moderna y fluida de DentaCare, completamente gratis y sin ningún compromiso.\n\n¿Les parece bien si les envío el enlace del boceto por esta vía cuando lo tenga listo?\n\nSaludos,\nSocio Blinq`,
              pitch_dm: `¡Hola! Me encantaron las reseñas de DentaCare en Monterrey. 🙌 Noté que su web móvil tarda un poco en abrirse y se cortan algunos botones de reserva. Hacemos webs premium y me gustaría regalarles un boceto visual gratuito y sin compromiso de un nuevo diseño móvil. ¿Les interesa ver la propuesta?`,
              draft_status: 'pending_review',
              contact_channel: 'email',
              sent_at: null
            },
            {
              lead_id: 'mock-2',
              business_name: 'Fit Zone Gym',
              phone: '+52 55 9876 5432',
              email: null,
              website: 'https://fitzone.com',
              has_website: false,
              instagram: 'https://instagram.com/fitzone_gym_mx',
              whatsapp: 'https://wa.me/525598765432',
              address: 'Colonia Roma, CDMX',
              google_rating: 3.8,
              website_issues: ['No se detectó un sitio web activo o el dominio está caído'],
              campaign_id: 'camp-2',
              niche: 'Gimnasios',
              city: 'Ciudad de México',
              draft_id: 'draft-2',
              subject: 'Propuesta de sitio web profesional para Fit Zone Gym',
              pitch_email: `Hola Fit Zone,\n\nNoté que al buscarlos en Google Maps y redes sociales, los clientes que quieren ver sus precios, horarios de clases o instructores de Fit Zone Gym no tienen un sitio web oficial donde consultar esta información de forma rápida y profesional.\n\nEn Blinq (blinqoficial.com) hacemos páginas web profesionales enfocadas en captar clientes. Me gustaría armarles una propuesta visual interactiva en Figma de una web moderna con calendario de clases integrado para su gimnasio, 100% gratis y sin ningún compromiso.\n\n¿Te puedo mandar la idea por aquí cuando la tenga armada?\n\nSaludos,\nSocio Blinq`,
              pitch_dm: `¡Hola! Qué gran vibra tiene el contenido de Fit Zone Gym en Instagram. 💪 Vi que no tienen un sitio web oficial para que los clientes reserven clases o vean precios. Hacemos diseño web y me gustaría regalarles un boceto visual gratuito de cómo se vería su web oficial. ¿Les puedo mandar el boceto?`,
              draft_status: 'pending_review',
              contact_channel: 'instagram',
              sent_at: null
            },
            {
              lead_id: 'mock-3',
              business_name: 'Marisco Loco',
              phone: '+1 305 555 0199',
              email: 'info@mariscoloco.com',
              website: 'https://mariscoloco.com',
              has_website: true,
              instagram: 'https://instagram.com/mariscolocomiami',
              whatsapp: 'https://wa.me/13055550199',
              address: 'Coral Gables, Miami FL',
              google_rating: 4.8,
              website_issues: ['Diseño web básico/anticuado', 'Sin menú digital interactivo'],
              campaign_id: 'camp-3',
              niche: 'Restaurantes',
              city: 'Miami, FL',
              draft_id: 'draft-3',
              subject: 'Idea visual de Menú QR moderno para Marisco Loco',
              pitch_email: `Hi Marisco Loco,\n\nI was looking for seafood spots in Miami and saw your awesome 4.8-star Google reviews. However, when going to mariscoloco.com, the menu is in a heavy PDF format which is very hard to read on phones.\n\nAt Blinq (blinqoficial.com) we design high-end digital menus. I wanted to design a quick, interactive web mockup showing how your menu could look beautiful on any phone, completely free and with no obligations.\n\nCould I send you the preview link once it's done?\n\nBest,\nBlinq Partner`,
              pitch_dm: `Hi! Marisco Loco looks incredible, congratulations on that 4.8 rating! 🦐 I noticed your online menu is a PDF which is a bit slow to load. We build premium digital experiences and I'd love to make a free web-menu mockup for you to check out. Can I send it over?`,
              draft_status: 'sent',
              contact_channel: 'email',
              sent_at: new Date().toISOString()
            }
          ];
          setLeads(mockLeads);
          setSelectedLead(mockLeads[0]);
        }
      } catch (e) {
        console.error('Error fetching leads:', e);
      } finally {
        setLoading(false);
      }
    }

    loadLeads();
  }, []);

  // Update edit forms when lead changes
  useEffect(() => {
    if (selectedLead) {
      setEditSubject(selectedLead.subject || '');
      setEditBody(selectedLead.pitch_email || '');
      setEditDm(selectedLead.pitch_dm || '');
      setActiveTab(selectedLead.email ? 'email' : 'dm');
    }
  }, [selectedLead]);

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setActionFeedback(null);
  };

  // 1. Send Email via Resend Route
  const handleSendEmail = async () => {
    if (!selectedLead) return;
    setSendLoading(true);
    setActionFeedback(null);

    try {
      const res = await fetch('/api/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLead.lead_id,
          subject: editSubject,
          emailBody: editBody
        })
      });
      const data = await res.json();

      if (res.ok) {
        setActionFeedback(data.message || '¡Mensaje enviado con éxito!');
        // Update local state
        setLeads(prev => prev.map(l => 
          l.lead_id === selectedLead.lead_id 
            ? { ...l, draft_status: 'sent', sent_at: new Date().toISOString(), subject: editSubject, pitch_email: editBody } 
            : l
        ));
        setSelectedLead(prev => prev ? { ...prev, draft_status: 'sent', sent_at: new Date().toISOString(), subject: editSubject, pitch_email: editBody } : null);
      } else {
        throw new Error(data.error || 'Error al enviar correo.');
      }
    } catch (e: any) {
      setActionFeedback(`Error: ${e.message}`);
    } finally {
      setSendLoading(false);
    }
  };

  // 2. Copy Pitch to Clipboard
  const handleCopyPitch = () => {
    const textToCopy = activeTab === 'email' ? `Asunto: ${editSubject}\n\n${editBody}` : editDm;
    navigator.clipboard.writeText(textToCopy);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  // 3. Open Social media channels
  const handleOpenSocial = (channel: 'instagram' | 'whatsapp') => {
    if (!selectedLead) return;
    handleCopyPitch(); // Copy first automatically! Excellent UX.
    
    let url = '';
    if (channel === 'instagram' && selectedLead.instagram) {
      url = selectedLead.instagram;
    } else if (channel === 'whatsapp' && selectedLead.whatsapp) {
      // Use wa.me link directly
      url = selectedLead.whatsapp;
    }
    
    if (url) {
      window.open(url, '_blank');
      
      // Update status locally as sent since they are opening it
      handleStatusChange('sent');
    }
  };

  // 4. Update lead status manually (sent, approved, rejected, pending_review)
  const handleStatusChange = async (newStatus: 'pending_review' | 'approved' | 'rejected' | 'sent') => {
    if (!selectedLead) return;
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLead.lead_id,
          draftStatus: newStatus,
          subject: editSubject,
          pitchEmail: editBody,
          pitchDm: editDm
        })
      });

      if (res.ok) {
        setLeads(prev => prev.map(l => 
          l.lead_id === selectedLead.lead_id 
            ? { ...l, draft_status: newStatus, subject: editSubject, pitch_email: editBody, pitch_dm: editDm } 
            : l
        ));
        setSelectedLead(prev => prev ? { ...prev, draft_status: newStatus, subject: editSubject, pitch_email: editBody, pitch_dm: editDm } : null);
        setActionFeedback(`Estado actualizado a: ${newStatus.toUpperCase()}`);
      }
    } catch (e) {
      console.error('Error updating status:', e);
    }
  };

  const filteredLeads = leads.filter(l => 
    l.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.niche.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Inbox de Revisión Diaria</h1>
        <p style={{ color: 'hsl(var(--text-secondary))', marginTop: '0.25rem' }}>
          Aprueba, edita y envía pitches personalizados para tus 100 prospectos del día.
        </p>
      </header>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          <div className="pulse-loading" style={{ width: '100%', height: '200px', borderRadius: 'var(--radius-md)' }}></div>
        </div>
      ) : (
        <div className="grid-main">
          {/* LEFT COLUMN: Leads list */}
          <div className="card" style={{ padding: '1.25rem', height: 'fit-content' }}>
            {/* Search leads */}
            <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
              <input 
                type="text" 
                placeholder="Buscar prospecto o nicho..." 
                className="form-input" 
                style={{ paddingLeft: '2.5rem' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search width={16} height={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
            </div>

            {/* List */}
            <div className="lead-list">
              {filteredLeads.map((lead) => (
                <div 
                  key={lead.lead_id} 
                  className={`lead-item ${selectedLead?.lead_id === lead.lead_id ? 'active' : ''}`}
                  onClick={() => handleSelectLead(lead)}
                >
                  <div className="lead-info-main">
                    <span className="lead-title">{lead.business_name}</span>
                    <div className="lead-meta">
                      <span>{lead.niche}</span>
                      <div className="dot-separator"></div>
                      <span>{lead.city}</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {lead.email && <Mail width={14} height={14} style={{ color: 'hsl(var(--color-primary))' }} />}
                    {lead.instagram && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'hsl(var(--color-accent))' }}>
                        <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                      </svg>
                    )}
                    <span className={`badge ${
                      lead.draft_status === 'sent' ? 'badge-sent' : 
                      lead.draft_status === 'approved' ? 'badge-approved' : 
                      'badge-pending'
                    }`}>
                      {lead.draft_status === 'sent' ? 'Enviado' : 
                       lead.draft_status === 'approved' ? 'Aprobado' : 
                       'Revisar'}
                    </span>
                  </div>
                </div>
              ))}
              
              {filteredLeads.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>
                  No se encontraron prospectos.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Inspector & Editor */}
          {selectedLead ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Card 1: Lead Details Audit */}
              <div className="card card-glow" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>{selectedLead.business_name}</h2>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                      <span className="badge badge-approved" style={{ textTransform: 'none' }}>{selectedLead.niche} en {selectedLead.city}</span>
                      {selectedLead.google_rating && (
                        <span className="badge badge-pending" style={{ textTransform: 'none' }}>⭐ {selectedLead.google_rating}/5 Google Maps</span>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-icon" title="Marcar como rechazado" onClick={() => handleStatusChange('rejected')}>
                      <Trash2 width={16} height={16} />
                    </button>
                    <button className="btn-icon" title="Marcar como aprobado" onClick={() => handleStatusChange('approved')}>
                      <CheckCircle2 width={16} height={16} style={{ color: 'hsl(var(--color-success))' }} />
                    </button>
                  </div>
                </div>

                {/* Audit issues */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--color-warning))', marginBottom: '0.5rem' }}>
                    <AlertTriangle width={14} height={14} /> Reporte de Auditoría de Presencia Web:
                  </h4>
                  <ul style={{ listStyle: 'none', paddingLeft: '0.5rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {selectedLead.website_issues.map((issue, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--text-secondary))' }}>
                        <span style={{ width: '4px', height: '4px', background: 'hsl(var(--color-warning))', borderRadius: '50%' }}></span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Direct info links */}
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'hsl(var(--text-muted))', flexWrap: 'wrap' }}>
                  <a href={selectedLead.website} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Globe width={14} height={14} /> Sitio Web <ExternalLink width={10} height={10} />
                  </a>
                  {selectedLead.email && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Mail width={14} height={14} /> {selectedLead.email}
                    </span>
                  )}
                  {selectedLead.instagram && (
                    <a href={selectedLead.instagram} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                      </svg> Instagram <ExternalLink width={10} height={10} />
                    </a>
                  )}
                  {selectedLead.phone && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Phone width={14} height={14} /> {selectedLead.phone}
                    </span>
                  )}
                </div>
              </div>

              {/* Card 2: AI Pitch Writer & Sender */}
              <div className="card" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', marginBottom: '1.5rem' }}>
                  <button 
                    onClick={() => setActiveTab('email')}
                    style={{ 
                      padding: '0.75rem 1.5rem', 
                      background: 'none', 
                      border: 'none', 
                      borderBottom: activeTab === 'email' ? '2px solid hsl(var(--color-primary))' : 'none', 
                      color: activeTab === 'email' ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Mail width={16} height={16} /> Cold Email
                  </button>
                  <button 
                    onClick={() => setActiveTab('dm')}
                    style={{ 
                      padding: '0.75rem 1.5rem', 
                      background: 'none', 
                      border: 'none', 
                      borderBottom: activeTab === 'dm' ? '2px solid hsl(var(--color-primary))' : 'none', 
                      color: activeTab === 'dm' ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <MessageSquare width={16} height={16} /> Script de Redes (DM)
                  </button>
                </div>

                {/* Tab content */}
                {activeTab === 'email' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {selectedLead.email ? (
                      <>
                        <div className="form-group">
                          <label className="form-label">Asunto del Correo</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={editSubject} 
                            onChange={(e) => setEditSubject(e.target.value)} 
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Cuerpo del Correo (Hormozi Hook & Boceto Gratis)</label>
                          <textarea 
                            className="form-textarea" 
                            rows={10} 
                            value={editBody} 
                            onChange={(e) => setEditBody(e.target.value)} 
                          />
                        </div>
                        
                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                          <button 
                            className="btn btn-primary" 
                            onClick={handleSendEmail}
                            disabled={sendLoading}
                            style={{ flex: 1, minWidth: '200px' }}
                          >
                            {sendLoading ? 'Enviando...' : (
                              <>
                                <Send width={16} height={16} /> Aprobar y Enviar Correo
                              </>
                            )}
                          </button>
                          
                          <button className="btn btn-secondary" onClick={handleCopyPitch}>
                            {copyFeedback ? (
                              <>
                                <Check width={16} height={16} style={{ color: 'hsl(var(--color-success))' }} /> ¡Copiado!
                              </>
                            ) : (
                              <>
                                <Copy width={16} height={16} /> Copiar Correo
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'hsl(var(--text-muted))', border: '1px dashed var(--glass-border)', borderRadius: 'var(--radius-sm)' }}>
                        <p style={{ fontWeight: 600, color: 'hsl(var(--text-secondary))', marginBottom: '0.25rem' }}>No se encontró correo de contacto.</p>
                        <p style={{ fontSize: '0.8rem' }}>Por favor, utiliza la pestaña de redes sociales o DMs para prospectar este negocio.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Script de DM Personalizado (Instagram / WhatsApp)</label>
                      <textarea 
                        className="form-textarea" 
                        rows={5} 
                        value={editDm} 
                        onChange={(e) => setEditDm(e.target.value)} 
                      />
                    </div>
                    
                    {/* Action buttons for socials */}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                      {selectedLead.instagram && (
                        <button 
                          className="btn btn-primary" 
                          onClick={() => handleOpenSocial('instagram')}
                          style={{ flex: 1, minWidth: '180px' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.25rem' }}>
                            <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                          </svg> Copiar & Abrir Instagram
                        </button>
                      )}
                      
                      {selectedLead.whatsapp && (
                        <button 
                          className="btn btn-success" 
                          onClick={() => handleOpenSocial('whatsapp')}
                          style={{ flex: 1, minWidth: '180px' }}
                        >
                          <Phone width={16} height={16} /> Copiar & Abrir WhatsApp
                        </button>
                      )}

                      <button className="btn btn-secondary" onClick={handleCopyPitch}>
                        {copyFeedback ? '¡Copiado!' : 'Copiar Mensaje'}
                      </button>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', textAlign: 'center', marginTop: '0.5rem' }}>
                      Al hacer clic en copiar y abrir, el script se copia automáticamente en tu portapapeles y se abre el canal del prospecto en una nueva pestaña para un envío ultra-rápido de DMs.
                    </p>
                  </div>
                )}

                {/* API Action Feedbacks */}
                {actionFeedback && (
                  <div style={{ marginTop: '1.25rem', padding: '0.85rem 1.25rem', background: 'hsla(var(--color-primary) / 0.1)', border: '1px solid hsla(var(--color-primary) / 0.3)', borderRadius: 'var(--radius-sm)', color: 'hsl(var(--text-primary))', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <Sparkles width={14} height={14} style={{ color: 'hsl(var(--color-primary))' }} />
                    {actionFeedback}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'hsl(var(--text-muted))' }}>
              Selecciona un prospecto de la izquierda para comenzar su auditoría e iniciar contacto.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
