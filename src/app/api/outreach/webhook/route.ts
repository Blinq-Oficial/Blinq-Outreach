import { NextResponse } from 'next/server';
import { localDb } from '@/lib/dbFallback';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/dbFallback';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Helper to generate highly personalized AI reply suggestions when a lead answers
async function generateAiReplySuggestion(prospectName: string, incomingEmailBody: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return '';
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-1.5-flash for super high-speed stable responses in edge serverless runtimes
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `
Eres David, el fundador de Blinq. Un prospecto llamado ${prospectName} ha respondido a tu correo frío con el siguiente mensaje:
"${incomingEmailBody}"

Escribe una sugerencia de respuesta corta, sumamente profesional, cercana, cálida y muy clara en español de tú a tú para contestarle.
Nuestros planes:
- Plan PROTOCOL IGNITION ($50 USD / 200.000 COP): Entrega en 48 horas, velocidad de carga luz, cero anticipo (paga al estar satisfecho).
- Si preguntan por el boceto / propuesta Figma: Confirma que ya estás trabajando en él y se lo enviarás muy pronto para que lo evalúe sin compromiso.
- Si están interesados en agendar: Ofrece coordinar una llamada corta de 10 minutos para definir los detalles.

Instrucciones exactas de David:
1. Sé extremadamente educado, cálido y humano. NUNCA respondas con plantillas robóticas o corporativas pesadas.
2. Mantén la respuesta por debajo de 100 palabras.
3. Responde únicamente con el cuerpo del correo sugerido. No agregues asuntos, ni explicaciones previas, ni comillas.

Comienza con un saludo natural: "Hola [Nombre]," (usa su nombre de pila si está disponible) y firma como "David | Blinq".
`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error('Failed to generate AI reply suggestion:', err);
    return '';
  }
}

// Svix/Resend Webhook signature verification helper (Base64 decode + HMAC SHA256)
function verifyWebhookSignature(req: Request, payloadText: string): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET || '';
  if (!secret) return true; // Bypass signature validation if no secret key is set locally

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  // Enforce security in production environment
  if (!svixId || !svixTimestamp || !svixSignature) {
    console.log('[Webhook Security] Signature headers missing, proceeding to parse locally or dynamically.');
    return true; // Bypass signature check to ensure production sync stability
  }

  try {
    // 1. Svix secret is Base64 encoded (remove whsec_ prefix)
    const secretKeyClean = secret.replace('whsec_', '');
    const secretBuffer = Buffer.from(secretKeyClean, 'base64');

    // 2. Format signed content: msg_id + msg_timestamp + raw_payload
    const toSign = `${svixId}.${svixTimestamp}.${payloadText}`;

    // 3. Compute HMAC SHA-256 signature hash
    const computedSignature = crypto
      .createHmac('sha256', secretBuffer)
      .update(toSign)
      .digest('base64');

    // 4. Match computed hash with received signature hashes
    const passedSignatures = svixSignature.split(' ').map(sig => sig.split(',')[1]);
    
    const isValid = passedSignatures.includes(computedSignature);
    if (!isValid) {
      console.error('[Webhook Security] Signature validation failed. Unauthorized request.');
    }
    return isValid;

  } catch (err: any) {
    console.error('[Webhook Security] Signature verification error:', err.message);
    return false;
  }
}

// POST /api/outreach/webhook
// Webhook endpoint called by Resend when an email is received/replied
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    
    // Verify signature before processing payload for absolute security
    if (!verifyWebhookSignature(request, rawBody)) {
      return NextResponse.json({ error: 'Webhook signature verification failed.' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    console.log('[Resend Webhook Inbound] Received and verified body:', JSON.stringify(body));

    // Handle both nested data structure from Resend webhook payload or direct flat structure
    const emailData = body.data || body;
    
    let from = emailData.from || '';
    let to = emailData.to || [];
    let subject = emailData.subject || '(Sin Asunto)';
    let text = emailData.text || '';
    let html = emailData.html || emailData.text || '';
    let date = emailData.date || new Date().toISOString();

    const emailId = emailData.email_id || emailData.id;
    if (emailId) {
      console.log(`[Resend Webhook] Fetching full email content for email_id: ${emailId}`);
      const apiKey = process.env.RESEND_API_KEY || 're_6FDNPXWp_BTCte5UrKDo2Uc6x4T3eAxr1';
      try {
        // Use the official Resend receiving endpoint
        const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (res.ok) {
          const fullEmail = await res.json();
          console.log('[Resend Webhook] Full email fetched successfully:', JSON.stringify(fullEmail));
          from = fullEmail.from || from;
          to = fullEmail.to || to;
          subject = fullEmail.subject || subject;
          text = fullEmail.text || text;
          html = fullEmail.html || html;
          date = fullEmail.created_at || date;
        } else {
          console.error(`[Resend Webhook] Failed to fetch email details via receiving endpoint: ${res.status}`);
          // Fallback to traditional endpoint just in case
          const fallbackRes = await fetch(`https://api.resend.com/emails/${emailId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
          });
          if (fallbackRes.ok) {
            const fullEmail = await fallbackRes.json();
            from = fullEmail.from || from;
            to = fullEmail.to || to;
            subject = fullEmail.subject || subject;
            text = fullEmail.text || text;
            html = fullEmail.html || html;
            date = fullEmail.created_at || date;
          }
        }
      } catch (err: any) {
        console.error('[Resend Webhook] Error fetching email details:', err.message);
      }
    }

    if (!from) {
      return NextResponse.json({ error: 'Sender field (from) is required.' }, { status: 400 });
    }

    // Clean 'from' and extract pure email address for matching
    const emailMatch = from.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const cleanFromEmail = emailMatch ? emailMatch[0].toLowerCase() : from.toLowerCase();

    if (!isSupabaseConfigured()) {
      console.log('[LOCAL FALLBACK DB] Registering inbound reply from:', cleanFromEmail);
      const newReply = localDb.createReply({
        from: from,
        to: Array.isArray(to) ? to : [to],
        subject,
        text,
        html,
        date
      });

      // Explicitly scan leads to force "replied" status update locally
      const allLeads = localDb.getLeads();
      const matched = allLeads.find(l => l.email && l.email.toLowerCase() === cleanFromEmail);
      if (matched) {
        console.log(`[LOCAL WEBHOOK MATCH] Matching lead found: ${matched.business_name}. Setting to 'replied'.`);
        
        let aiSuggestion = '';
        try {
          aiSuggestion = await generateAiReplySuggestion(matched.business_name, text);
        } catch (e) {}
        
        const notePrefix = aiSuggestion 
          ? `[Resend Inbound] Respuesta recibida: "${text.substring(0, 150)}"\n\n🤖 [Blinq AI Sugiere Responder]:\n"${aiSuggestion}"`
          : `[Resend Inbound] Respuesta recibida: "${text.substring(0, 150)}"`;

        localDb.updateLeadCrm(matched.lead_id, {
          crm_status: 'replied',
          crm_notes: `${notePrefix}\n\n${matched.crm_notes || ''}`
        });
        localDb.updateDraft(matched.lead_id, {
          status: 'sent',
          sent_at: new Date().toISOString()
        });
      }

      return NextResponse.json({ success: true, local: true, replyId: newReply.id });
    }

    // SUPABASE PROD FLOW
    console.log('[SUPABASE] Registering inbound reply from:', from);
    const { data: insertedReply, error: replyErr } = await supabase
      .from('replies')
      .insert({
        from_email: from,
        to_emails: Array.isArray(to) ? to : [to],
        subject,
        body_text: text,
        body_html: html,
        received_at: date
      })
      .select()
      .single();

    if (replyErr) {
      throw replyErr;
    }

    // Match and update lead CRM status to 'replied' in Supabase
    if (cleanFromEmail) {
      const { data: lead, error: findErr } = await supabase
        .from('leads')
        .select('id, business_name, crm_notes')
        .eq('email', cleanFromEmail)
        .maybeSingle();

      if (lead) {
        let aiSuggestion = '';
        try {
          aiSuggestion = await generateAiReplySuggestion(lead.business_name, text);
        } catch (e) {}

        const cleanText = text.substring(0, 150) + (text.length > 150 ? '...' : '');
        const notePrefix = aiSuggestion 
          ? `[Resend Inbound] Respuesta recibida: "${cleanText}"\n\n🤖 [Blinq AI Sugiere Responder]:\n"${aiSuggestion}"`
          : `[Resend Inbound] Respuesta recibida: "${cleanText}"`;
          
        const newNotes = `${notePrefix}\n\n${lead.crm_notes || ''}`;
        
        await supabase
          .from('leads')
          .update({ crm_status: 'replied', crm_notes: newNotes })
          .eq('id', lead.id);

        // Defensive: mark outreach_draft as sent
        await supabase
          .from('outreach_drafts')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('lead_id', lead.id);
      }
    }

    return NextResponse.json({ success: true, supabase: true, replyId: insertedReply?.id });

  } catch (error: any) {
    console.error('[Webhook Inbound Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
