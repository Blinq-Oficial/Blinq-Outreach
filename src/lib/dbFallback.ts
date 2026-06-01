import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'database_fallback.json');

export interface LocalCampaign {
  id: string;
  niche: string;
  city: string;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
}

export interface LocalLead {
  id: string;
  campaign_id: string;
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
  crm_status?: 'lead' | 'contacted' | 'replied' | 'mockup_sent' | 'won' | 'lost';
  crm_notes?: string;
  created_at: string;
  referred_by?: string | null;
}

export interface LocalPartner {
  id: string;
  name: string;
  label: string;
  phone: string;
  whatsapp_url: string;
  avatar_color: string;
  created_at: string;
}

export interface LocalDraft {
  id: string;
  lead_id: string;
  subject: string | null;
  pitch_email: string;
  pitch_dm: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'sent';
  contact_channel: 'email' | 'instagram' | 'whatsapp';
  sent_at: string | null;
  created_at: string;
}

export interface LocalReply {
  id: string;
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
  date: string;
  created_at: string;
}

export interface LocalProject {
  id: string;
  name: string;
  amount: number;
  type: 'standard' | 'family' | 'custom';
  davidShare: number;
  samuelShare: number;
  receivedBy?: 'company' | 'david' | 'samuel';
  created_at: string;
}

export interface LocalExpense {
  id: string;
  description: string;
  amount: number;
  paidBy: 'david' | 'samuel' | 'company';
  splitBetween: '50/50' | '70/30' | 'company';
  created_at: string;
}

interface LocalDatabase {
  campaigns: LocalCampaign[];
  leads: LocalLead[];
  drafts: LocalDraft[];
  replies?: LocalReply[];
  partners?: LocalPartner[];
  projects?: LocalProject[];
  expenses?: LocalExpense[];
}

function initDb(): LocalDatabase {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(content) as LocalDatabase;
      parsed.replies = parsed.replies || [];
      parsed.partners = parsed.partners || [];
      parsed.projects = parsed.projects || [];
      parsed.expenses = parsed.expenses || [];
      return parsed;
    } catch (e) {
      console.error('Error reading local fallback database, resetting:', e);
    }
  }

  const initial: LocalDatabase = {
    replies: [],
    campaigns: [
      { id: 'camp-1', niche: 'Dentistas', city: 'Monterrey, MX', status: 'active', created_at: new Date().toISOString() },
      { id: 'camp-2', niche: 'Gimnasios', city: 'Ciudad de México', status: 'active', created_at: new Date().toISOString() }
    ],
    leads: [
      {
        id: 'lead-1',
        campaign_id: 'camp-1',
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
        crm_status: 'lead',
        crm_notes: '',
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'lead-2',
        campaign_id: 'camp-2',
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
        crm_status: 'lead',
        crm_notes: '',
        created_at: new Date().toISOString()
      }
    ],
    drafts: [
      {
        id: 'draft-1',
        lead_id: 'lead-1',
        subject: 'Idea rápida para mejorar el sitio móvil de DentaCare',
        pitch_email: `Hola DentaCare,\n\nEstaba buscando dentistas en Monterrey y me encontré con su perfil. Tienen excelentes reseñas, pero al visitar dentacare.com.mx desde mi celular noté que tarda más de 4 segundos en cargar y algunos botones de reserva de citas se cortan en la pantalla.\n\nEn Blinq (blinqoficial.com) nos dedicamos a hacer páginas web premium que cargan al instante. Se me ocurrió diseñar un boceto visual rápido en Figma de cómo se vería una versión móvil moderna y fluida de DentaCare, completamente gratis y sin ningún compromiso.\n\n¿Les parece bien si les envío el enlace del boceto por esta vía cuando lo tenga listo?\n\nSaludos,\nSocio Blinq`,
        pitch_dm: `¡Hola! Me encantaron las reseñas de DentaCare en Monterrey. 🙌 Noté que su web móvil tarda un poco en abrirse y se cortan algunos botones de reserva. Hacemos webs premium y me gustaría regalarles un boceto visual gratuito y sin compromiso de un nuevo diseño móvil. ¿Les interesa ver la propuesta?`,
        status: 'pending_review',
        contact_channel: 'email',
        sent_at: null,
        created_at: new Date().toISOString()
      },
      {
        id: 'draft-2',
        lead_id: 'lead-2',
        subject: 'Propuesta de sitio web profesional para Fit Zone Gym',
        pitch_email: `Hola Fit Zone,\n\nNoté que al buscarlos en Google Maps y redes sociales, los clientes que quieren ver sus precios, horarios de clases o instructores de Fit Zone Gym no tienen un sitio web oficial donde consultar esta información de forma rápida y profesional.\n\nEn Blinq (blinqoficial.com) hacemos páginas web profesionales enfocadas en captar clientes. Me gustaría armarles una propuesta visual interactiva en Figma de una web moderna con calendario de clases integrado para su gimnasio, 100% gratis y sin ningún compromiso.\n\n¿Te puedo mandar la idea por aquí cuando la tenga armada?\n\nSaludos,\nSocio Blinq`,
        pitch_dm: `¡Hola! Qué gran vibra tiene el contenido de Fit Zone Gym en Instagram. 💪 Vi que no tienen un sitio web oficial para que los clientes reserven clases o vean precios. Hacemos diseño web y me gustaría regalarles un boceto visual gratuito de cómo se vería su web oficial. ¿Les puedo mandar el boceto?`,
        status: 'pending_review',
        contact_channel: 'instagram',
        sent_at: null,
        created_at: new Date().toISOString()
      }
    ]
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
  return initial;
}

const db = initDb();

function loadDb(): LocalDatabase {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(content) as LocalDatabase;
      db.campaigns = parsed.campaigns || [];
      db.leads = parsed.leads || [];
      db.drafts = parsed.drafts || [];
      db.replies = parsed.replies || [];
      db.partners = parsed.partners || [];
      db.projects = parsed.projects || [];
      db.expenses = parsed.expenses || [];
    } catch (e) {
      console.error('Error reloading local fallback database:', e);
    }
  }
  return db;
}

function saveDb() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Check if Supabase environment is fully defined
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return url !== '' && !url.includes('placeholder') && key !== '' && !key.includes('placeholder');
}

export const localDb = {
  getCampaigns: () => {
    loadDb();
    return db.campaigns;
  },
  
  createCampaign: (niche: string, city: string) => {
    loadDb();
    const existing = db.campaigns.find(c => c.niche.toLowerCase() === niche.toLowerCase() && c.city.toLowerCase() === city.toLowerCase());
    if (existing) return existing;
    
    const newCamp: LocalCampaign = {
      id: 'camp-' + Math.random().toString(36).substring(7),
      niche,
      city,
      status: 'active',
      created_at: new Date().toISOString()
    };
    db.campaigns.unshift(newCamp);
    saveDb();
    return newCamp;
  },

  getCampaignById: (id: string) => {
    loadDb();
    return db.campaigns.find(c => c.id === id);
  },

  getLeads: (campaignId?: string, status?: string) => {
    loadDb();
    let result = db.leads.map(lead => {
      const campaign = db.campaigns.find(c => c.id === lead.campaign_id);
      const draft = db.drafts.find(d => d.lead_id === lead.id);
      
      return {
        lead_id: lead.id,
        business_name: lead.business_name,
        phone: lead.phone,
        email: lead.email,
        website: lead.website,
        has_website: lead.has_website,
        instagram: lead.instagram,
        whatsapp: lead.whatsapp,
        address: lead.address,
        google_rating: lead.google_rating,
        website_issues: lead.website_issues,
        campaign_id: lead.campaign_id,
        niche: campaign?.niche || 'Negocios',
        city: campaign?.city || 'Local',
        draft_id: draft?.id || null,
        subject: draft?.subject || null,
        pitch_email: draft?.pitch_email || '',
        pitch_dm: draft?.pitch_dm || '',
        draft_status: draft?.status || 'pending_review',
        contact_channel: draft?.contact_channel || 'email',
        sent_at: draft?.sent_at || null,
        crm_status: lead.crm_status || 'lead',
        crm_notes: lead.crm_notes || '',
        referred_by: lead.referred_by || null
      };
    });

    if (campaignId) {
      result = result.filter(r => r.campaign_id === campaignId);
    }
    if (status) {
      result = result.filter(r => r.draft_status === status);
    }

    return result;
  },

  createLead: (campaignId: string, lead: Omit<LocalLead, 'id' | 'campaign_id' | 'created_at'>) => {
    loadDb();
    const existing = db.leads.find(l => l.campaign_id === campaignId && l.website === lead.website);
    if (existing) return existing;

    const newLead: LocalLead = {
      ...lead,
      id: 'lead-' + Math.random().toString(36).substring(7),
      campaign_id: campaignId,
      crm_status: 'lead',
      crm_notes: '',
      created_at: new Date().toISOString()
    };
    db.leads.push(newLead);
    saveDb();
    return newLead;
  },

  createDraft: (leadId: string, draft: Omit<LocalDraft, 'id' | 'lead_id' | 'created_at'>) => {
    loadDb();
    const existingIdx = db.drafts.findIndex(d => d.lead_id === leadId);
    
    const newDraft: LocalDraft = {
      ...draft,
      id: 'draft-' + Math.random().toString(36).substring(7),
      lead_id: leadId,
      created_at: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      db.drafts[existingIdx] = { ...db.drafts[existingIdx], ...draft };
    } else {
      db.drafts.push(newDraft);
    }
    saveDb();
    return newDraft;
  },

  updateDraft: (leadId: string, updates: Partial<LocalDraft>) => {
    loadDb();
    const draftIdx = db.drafts.findIndex(d => d.lead_id === leadId);
    if (draftIdx >= 0) {
      db.drafts[draftIdx] = { ...db.drafts[draftIdx], ...updates };
      saveDb();
      return db.drafts[draftIdx];
    }
    return null;
  },

  updateLeadCrm: (leadId: string, updates: { crm_status?: LocalLead['crm_status']; crm_notes?: string }) => {
    loadDb();
    const leadIdx = db.leads.findIndex(l => l.id === leadId);
    if (leadIdx >= 0) {
      db.leads[leadIdx] = { ...db.leads[leadIdx], ...updates };
      saveDb();
      return db.leads[leadIdx];
    }
    return null;
  },

  getReplies: () => {
    loadDb();
    return db.replies || [];
  },

  createReply: (reply: Omit<LocalReply, 'id' | 'created_at'>) => {
    loadDb();
    db.replies = db.replies || [];
    const newReply: LocalReply = {
      ...reply,
      id: 'reply-' + Math.random().toString(36).substring(7),
      created_at: new Date().toISOString()
    };
    db.replies.unshift(newReply);

    // Try to match the 'from' email with an existing lead
    const fromStr = reply.from || '';
    const emailMatch = fromStr.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      const email = emailMatch[0].toLowerCase();
      const matchedLead = db.leads.find(l => l.email && l.email.toLowerCase() === email);
      if (matchedLead) {
        matchedLead.crm_status = 'replied';
        const cleanText = (reply.text || '').substring(0, 150) + (reply.text.length > 150 ? '...' : '');
        matchedLead.crm_notes = `[Resend Inbound] Respuesta recibida: "${cleanText}"\n${matchedLead.crm_notes || ''}`;
        
        // Also mark draft as sent if it wasn't already (defensive update)
        const draft = db.drafts.find(d => d.lead_id === matchedLead.id);
        if (draft && draft.status !== 'sent') {
          draft.status = 'sent';
          draft.sent_at = draft.sent_at || new Date().toISOString();
        }
      }
    }

    saveDb();
    return newReply;
  },

  getPartners: () => {
    loadDb();
    return db.partners || [];
  },

  getPartnerById: (id: string) => {
    loadDb();
    return (db.partners || []).find(p => p.id === id);
  },

  createPartner: (partner: Omit<LocalPartner, 'id' | 'created_at'>) => {
    loadDb();
    db.partners = db.partners || [];
    const newPartner: LocalPartner = {
      ...partner,
      id: 'aff-' + Math.random().toString(36).substring(7),
      created_at: new Date().toISOString()
    };
    db.partners.push(newPartner);
    saveDb();
    return newPartner;
  },

  getProjects: () => {
    loadDb();
    return db.projects || [];
  },

  getExpenses: () => {
    loadDb();
    return db.expenses || [];
  },

  addProject: (project: Omit<LocalProject, 'id' | 'created_at'>) => {
    loadDb();
    db.projects = db.projects || [];
    const newProj: LocalProject = {
      ...project,
      id: 'proj-' + Math.random().toString(36).substring(7),
      created_at: new Date().toISOString()
    };
    db.projects.push(newProj);
    saveDb();
    return newProj;
  },

  deleteProject: (id: string) => {
    loadDb();
    db.projects = db.projects || [];
    db.projects = db.projects.filter(p => p.id !== id);
    saveDb();
  },

  addExpense: (expense: Omit<LocalExpense, 'id' | 'created_at'>) => {
    loadDb();
    db.expenses = db.expenses || [];
    const newExp: LocalExpense = {
      ...expense,
      id: 'exp-' + Math.random().toString(36).substring(7),
      created_at: new Date().toISOString()
    };
    db.expenses.push(newExp);
    saveDb();
    return newExp;
  },

  deleteExpense: (id: string) => {
    loadDb();
    db.expenses = db.expenses || [];
    db.expenses = db.expenses.filter(e => e.id !== id);
    saveDb();
  }
};
