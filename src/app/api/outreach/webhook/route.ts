import { NextResponse } from 'next/server';
import { localDb } from '@/lib/dbFallback';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/dbFallback';
import crypto from 'crypto';

// Svix/Resend Webhook signature verification helper (Base64 decode + HMAC SHA256)
function verifyWebhookSignature(req: Request, payloadText: string): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET || '';
  if (!secret) return true; // Bypass signature validation if no secret key is set locally

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  // Enforce security in production environment
  if (!svixId || !svixTimestamp || !svixSignature) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[Webhook Security] Missing Svix signature headers in production.');
      return false;
    }
    return true; // Bypass signature check on local sandbox testing
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

    const emailId = emailData.email_id;
    if (emailId) {
      console.log(`[Resend Webhook] Fetching full email content for email_id: ${emailId}`);
      const apiKey = process.env.RESEND_API_KEY || 're_6FDNPXWp_BTCte5UrKDo2Uc6x4T3eAxr1';
      try {
        const res = await fetch(`https://api.resend.com/emails/${emailId}`, {
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
          console.error(`[Resend Webhook] Failed to fetch email details: ${res.status}`);
        }
      } catch (err: any) {
        console.error('[Resend Webhook] Error fetching email details:', err.message);
      }
    }

    if (!from) {
      return NextResponse.json({ error: 'Sender field (from) is required.' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      console.log('[LOCAL FALLBACK DB] Registering inbound reply from:', from);
      const newReply = localDb.createReply({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        text,
        html,
        date
      });
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
    const emailMatch = from.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      const email = emailMatch[0].toLowerCase();
      const { data: lead, error: findErr } = await supabase
        .from('leads')
        .select('id, crm_notes')
        .eq('email', email)
        .maybeSingle();

      if (lead) {
        const cleanText = text.substring(0, 150) + (text.length > 150 ? '...' : '');
        const newNotes = `[Resend Inbound] Respuesta recibida: "${cleanText}"\n${lead.crm_notes || ''}`;
        
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
