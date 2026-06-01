'use client';

import React, { useState, useEffect } from 'react';

interface Campaign {
  id: string;
  niche: string;
  city: string;
  status: string;
}

export default function ProspectorPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Form fields
  const [campaignId, setCampaignId] = useState('');
  const [targetName, setTargetName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [niche, setNiche] = useState('Clínica Dental');
  const [city, setCity] = useState('Monterrey, MX');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');
  
  // Custom lead extra fields for CRM
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  // Selected Channel
  const [channel, setChannel] = useState<'linkedin_connect' | 'linkedin_dm' | 'fb_comment' | 'fb_messenger'>('linkedin_connect');

  // Copywriting output states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPitch, setGeneratedPitch] = useState('');
  const [tipText, setTipText] = useState('Completa los campos e inicia la generación.');
  const [toastMessage, setToastMessage] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Load active campaigns for selection
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await fetch('/api/campaigns');
        const data = await res.json();
        if (Array.isArray(data)) {
          setCampaigns(data);
          if (data.length > 0) {
            setCampaignId(data[0].id);
          }
        }
      } catch (e) {
        console.error('Error fetching campaigns:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, []);

  // Update niche and city when campaign selection changes
  const handleCampaignChange = (id: string) => {
    setCampaignId(id);
    const selected = campaigns.find(c => c.id === id);
    if (selected) {
      setNiche(selected.niche);
      setCity(selected.city);
    }
  };

  // Helper to show brief toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Standard static human-designed copy templates for instant fallback
  const getStaticFallbackTemplate = (chan: typeof channel) => {
    const tName = targetName ? targetName.trim() : 'dueño de la marca';
    const bName = businessName ? businessName.trim() : 'tu clínica';
    const webStr = website ? `en ${website}` : '';
    
    switch (chan) {
      case 'linkedin_connect':
        return `Hola ${tName}, vi tu excelente perfil y tus reseñas. Noté que tu web móvil carga algo lento y se desalinea. Conectemos para compartirte www.blinqoficial.com y ver si te sirve de idea.`;
      case 'linkedin_dm':
        return `Hola Dra./Dr. ${tName}, me presento: soy David de Blinq (www.blinqoficial.com). Estaba viendo lo que hacen en ${bName} y noté que tienen una reputación maravillosa, pero la web móvil se desajusta al reservar citas. Hacemos webs premium a precios muy competitivos. Puedes ver ejemplos de lo que construimos en www.blinqoficial.com. Si en algún momento necesitas actualizar tu portal o tu SEO, quedo a tu entera disposición. Un saludo cordial.`;
      case 'fb_comment':
        return `Hola ${tName}, si estás buscando renovar tu presencia web, fíjate mucho en la velocidad de carga móvil. Más del 50% de clientes se van si tarda más de 3 segundos. Puedes ver ejemplos de código limpio y carga al instante en lo que hacemos en www.blinqoficial.com. ¡Mucho éxito con tu proyecto!`;
      case 'fb_messenger':
        return `Hola ${tName}, espero que todo vaya genial. Vi tu publicación en el grupo de Facebook y noté que tu página web ${webStr} tarda un poco en abrirse. Me presento de forma rápida: soy David de Blinq (www.blinqoficial.com). Desarrollamos sitios premium súper limpios y rápidos. Si gustas, te comparto nuestra página www.blinqoficial.com para que veas algunos de nuestros trabajos de primer nivel. ¡Cualquier duda me avisas!`;
    }
  };

  // Trigger copy generator via Gemini or fallbacks
  const generatePitch = async () => {
    if (!businessName) {
      triggerToast('⚠️ Por favor ingresa el nombre del negocio.');
      return;
    }
    
    setIsGenerating(true);
    setGeneratedPitch('');
    setTipText('Llamando a Gemini 2.5 Flash...');

    try {
      const res = await fetch('/api/prospector/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetName,
          businessName,
          niche,
          city,
          website,
          channel
        })
      });

      const data = await res.json();
      if (res.ok && data.message) {
        setGeneratedPitch(data.message);
        setTipText(data.tip || 'Mensaje de prospección generado exitosamente con Gemini.');
      } else {
        // Use static fallback on error/missing API Key
        const fallbackMsg = getStaticFallbackTemplate(channel);
        setGeneratedPitch(fallbackMsg);
        setTipText('Generación offline completada. (API Key de Gemini no disponible).');
      }
    } catch (e) {
      console.error(e);
      const fallbackMsg = getStaticFallbackTemplate(channel);
      setGeneratedPitch(fallbackMsg);
      setTipText('Generación offline completada debido a una excepción.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy generated text to clipboard
  const handleCopyToClipboard = () => {
    if (!generatedPitch) return;
    navigator.clipboard.writeText(generatedPitch);
    triggerToast('📋 ¡Copiado al portapapeles!');
  };

  // Save Lead and outreach draft into CRM
  const handleSaveToCRM = async () => {
    if (!businessName) {
      triggerToast('⚠️ Se requiere nombre de negocio.');
      return;
    }
    if (!campaignId) {
      triggerToast('⚠️ Debes seleccionar una campaña.');
      return;
    }

    setSaveStatus('saving');

    try {
      const issues = ['Contacto inicial por prospección en redes sociales'];
      if (website && generatedPitch.toLowerCase().includes('carga lento')) {
        issues.push('Tiempo de carga móvil lento detectado');
      }

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          businessName,
          phone: phone || null,
          email: email || null,
          website: website || `https://facebook.com/search/people/?q=${encodeURIComponent(targetName || businessName)}`,
          instagram: instagram || null,
          whatsapp: whatsapp || null,
          address: city,
          googleRating: 4.5,
          websiteIssues: issues,
          pitchSubject: channel.toUpperCase() + ' - Conexión Blinq',
          pitchEmail: generatedPitch,
          pitchDm: generatedPitch,
          contactChannel: channel.includes('linkedin') ? 'email' : 'whatsapp', // Maps to nearest channel
          crmStatus: 'lead',
          crmNotes: `[Social Prospector] Prospectado en ${channel.toUpperCase()} como: ${targetName || 'Propietario'}. Notas: ${notes}`
        })
      });

      if (res.ok) {
        setSaveStatus('success');
        triggerToast('✅ ¡Lead guardado en el CRM exitosamente!');
        // Clear manual inputs
        setTargetName('');
        setBusinessName('');
        setWebsite('');
        setNotes('');
        setPhone('');
        setEmail('');
        setInstagram('');
        setWhatsapp('');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        triggerToast('❌ Error al guardar en base de datos.');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch (e) {
      console.error(e);
      setSaveStatus('error');
      triggerToast('❌ Excepción al intentar guardar lead.');
      setTimeout(() => setSaveStatus('idle'), 2000);
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
      
      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'rgba(168, 85, 247, 0.95)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#ffffff',
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(168,85,247,0.4)',
          zIndex: 9999,
          fontWeight: 700,
          fontSize: '0.85rem',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease'
        }}>
          {toastMessage}
        </div>
      )}

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
          Prospección Social Blinq 🌐
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Diseña mensajes ultra-humanos sin jerga de IA para LinkedIn y Facebook, y regístralos directo al pipeline de Blinq.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
        
        {/* Form Column */}
        <div className="glass-card" style={{ 
          padding: '2rem', 
          borderRadius: 'var(--radius-lg)', 
          border: '1px solid var(--border-default)',
          background: 'rgba(9, 10, 16, 0.7)'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📝 Información del Prospecto
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            
            {/* Campaign Selection */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Asociar a Campaña Blinq</label>
              <select 
                value={campaignId} 
                onChange={(e) => handleCampaignChange(e.target.value)}
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
                {campaigns.map((camp) => (
                  <option key={camp.id} value={camp.id}>
                    {camp.niche} ({camp.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Target & Business names */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Nombre de la Persona (Ej: Dra. Laura)</label>
                <input 
                  type="text" 
                  value={targetName} 
                  onChange={(e) => setTargetName(e.target.value)} 
                  placeholder="Opcional"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#ffffff',
                    marginTop: '0.35rem'
                  }}
                />
              </div>
              
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Nombre del Negocio *</label>
                <input 
                  type="text" 
                  value={businessName} 
                  onChange={(e) => setBusinessName(e.target.value)} 
                  placeholder="Ej: Dental Cumbres"
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
            </div>

            {/* Website URL */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Sitio Web Actual (si tiene)</label>
              <input 
                type="text" 
                value={website} 
                onChange={(e) => setWebsite(e.target.value)} 
                placeholder="Ej: www.clinica.com (dejar vacío si no tiene)"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#ffffff',
                  marginTop: '0.35rem'
                }}
              />
            </div>

            {/* CRM Contact Details (Social / Phone) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>WhatsApp</label>
                <input 
                  type="text" 
                  value={whatsapp} 
                  onChange={(e) => setWhatsapp(e.target.value)} 
                  placeholder="Ej: +52 81..."
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#ffffff',
                    marginTop: '0.25rem',
                    fontSize: '0.8rem'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Instagram (URL/User)</label>
                <input 
                  type="text" 
                  value={instagram} 
                  onChange={(e) => setInstagram(e.target.value)} 
                  placeholder="Ej: @clinica_mty"
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#ffffff',
                    marginTop: '0.25rem',
                    fontSize: '0.8rem'
                  }}
                />
              </div>
            </div>

            {/* Selector de Red Social / Canal */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>
                Canal y Formato del Mensaje
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                
                {/* LinkedIn Connect */}
                <button 
                  type="button" 
                  onClick={() => setChannel('linkedin_connect')}
                  style={{
                    padding: '0.65rem',
                    background: channel === 'linkedin_connect' ? 'rgba(10, 102, 194, 0.15)' : 'rgba(0,0,0,0.2)',
                    border: channel === 'linkedin_connect' ? '1px solid #0a66c2' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <span style={{ fontWeight: 700, color: '#0a66c2' }}>🔗 LinkedIn Nota</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Límite 140 caracteres</span>
                </button>

                {/* LinkedIn DM */}
                <button 
                  type="button" 
                  onClick={() => setChannel('linkedin_dm')}
                  style={{
                    padding: '0.65rem',
                    background: channel === 'linkedin_dm' ? 'rgba(10, 102, 194, 0.15)' : 'rgba(0,0,0,0.2)',
                    border: channel === 'linkedin_dm' ? '1px solid #0a66c2' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <span style={{ fontWeight: 700, color: '#0a66c2' }}>💬 LinkedIn InMail / DM</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Mensaje de seguimiento</span>
                </button>

                {/* Facebook Comment */}
                <button 
                  type="button" 
                  onClick={() => setChannel('fb_comment')}
                  style={{
                    padding: '0.65rem',
                    background: channel === 'fb_comment' ? 'rgba(24, 119, 242, 0.12)' : 'rgba(0,0,0,0.2)',
                    border: channel === 'fb_comment' ? '1px solid #1877f2' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <span style={{ fontWeight: 700, color: '#1877f2' }}>💬 FB Grupos Comentario</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Aporte de valor indirecto</span>
                </button>

                {/* Facebook Messenger */}
                <button 
                  type="button" 
                  onClick={() => setChannel('fb_messenger')}
                  style={{
                    padding: '0.65rem',
                    background: channel === 'fb_messenger' ? 'rgba(24, 119, 242, 0.12)' : 'rgba(0,0,0,0.2)',
                    border: channel === 'fb_messenger' ? '1px solid #1877f2' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <span style={{ fontWeight: 700, color: '#1877f2' }}>✉️ FB Messenger Privado</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Pitch conversacional</span>
                </button>
              </div>
            </div>

            {/* Custom Notes */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Notas sobre este lead (Para el CRM)</label>
              <textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                placeholder="Ej: Respondió a una publicación de 'Busco programador' en el grupo Emprendedores Mty."
                style={{
                  width: '100%',
                  height: '70px',
                  padding: '0.75rem',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#ffffff',
                  marginTop: '0.35rem',
                  fontFamily: 'inherit',
                  resize: 'none'
                }}
              />
            </div>

            {/* Generate Button */}
            <button 
              type="button"
              onClick={generatePitch}
              disabled={isGenerating}
              style={{
                marginTop: '0.5rem',
                padding: '0.75rem',
                background: isGenerating ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #a855f7, #7c3aed)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                color: '#ffffff',
                fontWeight: 700,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                boxShadow: isGenerating ? 'none' : '0 0 16px rgba(168,85,247,0.3)',
                transition: 'transform 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {isGenerating ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid #ffffff' }}></div>
                  Modelando Copy Humano...
                </>
              ) : (
                <>
                  ⚡ Generar Mensaje (Gemini)
                </>
              )}
            </button>

          </div>
        </div>

        {/* Copywriting & Integration Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Output Card */}
          <div className="glass-card" style={{ 
            padding: '2rem', 
            borderRadius: 'var(--radius-lg)', 
            border: '1px solid var(--border-default)',
            background: 'rgba(9, 10, 16, 0.85)',
            boxShadow: 'var(--shadow-lg)',
            flex: 1,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ✍️ Copy Personalizado
              </h2>
              {generatedPitch && (
                <span style={{
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '99px',
                  background: generatedPitch.length <= 140 && channel === 'linkedin_connect' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: generatedPitch.length <= 140 && channel === 'linkedin_connect' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.08)',
                  color: generatedPitch.length <= 140 && channel === 'linkedin_connect' ? '#10b981' : 'var(--text-secondary)'
                }}>
                  Caracteres: {generatedPitch.length} {channel === 'linkedin_connect' && '/ 140 max'}
                </span>
              )}
            </div>

            {/* Result Area */}
            <div style={{ flex: 1, position: 'relative', minHeight: '200px' }}>
              <textarea
                value={generatedPitch}
                onChange={(e) => setGeneratedPitch(e.target.value)}
                placeholder="El copy generado aparecerá aquí. Puedes editarlo libremente en este bloque antes de copiarlo."
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: '240px',
                  background: '#040406',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  color: '#f4f4f5',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                  lineHeight: '1.6',
                  resize: 'vertical',
                  boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.8)'
                }}
              />
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              {/* Copy button */}
              <button 
                onClick={handleCopyToClipboard}
                disabled={!generatedPitch}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: generatedPitch ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 'var(--radius-sm)',
                  color: generatedPitch ? '#ffffff' : 'var(--text-muted)',
                  fontWeight: 700,
                  cursor: generatedPitch ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                📋 Copiar Mensaje
              </button>

              {/* Save button */}
              <button 
                onClick={handleSaveToCRM}
                disabled={!businessName || saveStatus === 'saving'}
                style={{
                  flex: 1.2,
                  padding: '0.75rem',
                  background: !businessName ? 'rgba(255,255,255,0.02)' : 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: !businessName ? 'var(--text-muted)' : '#ffffff',
                  fontWeight: 700,
                  cursor: !businessName ? 'not-allowed' : 'pointer',
                  boxShadow: !businessName ? 'none' : '0 0 16px rgba(16,185,129,0.2)',
                  transition: 'all 0.25s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {saveStatus === 'saving' ? (
                  <>Guardando...</>
                ) : saveStatus === 'success' ? (
                  <>✅ ¡Guardado!</>
                ) : (
                  <>📥 Registrar en CRM</>
                )}
              </button>
            </div>
          </div>

          {/* Tips Box */}
          <div className="glass-card" style={{
            padding: '1.25rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(168, 85, 247, 0.15)',
            background: 'linear-gradient(135deg, rgba(9, 10, 16, 0.9) 0%, rgba(15, 17, 26, 0.9) 100%)',
            boxShadow: '0 0 20px rgba(168, 85, 247, 0.02)'
          }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{
                background: 'rgba(168, 85, 247, 0.12)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a855f7',
                fontSize: '1rem',
                flexShrink: 0
              }}>
                💡
              </div>
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.2rem' }}>Consejo de Prospección Social</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {tipText}
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
