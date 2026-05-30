import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured, localDb } from '@/lib/dbFallback';

const apiKey = process.env.RESEND_API_KEY || '';
const resend = apiKey ? new Resend(apiKey) : null;
const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';

// POST: Send cold email to lead and mark draft as sent
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { leadId, subject, emailBody } = body;

    if (!leadId || !subject || !emailBody) {
      return NextResponse.json({ error: 'Lead ID, subject, and email body are required.' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      console.log(`[LOCAL FALLBACK DB] Sending outreach email locally for leadId: ${leadId}`);
      const allLeads = localDb.getLeads();
      const lead = allLeads.find(l => l.lead_id === leadId);

      if (!lead) {
        return NextResponse.json({ error: 'Lead not found locally.' }, { status: 404 });
      }

      if (!lead.email) {
        return NextResponse.json({ error: 'This lead does not have a registered email address.' }, { status: 400 });
      }

      let messageId = 'simulated_id_' + Math.random().toString(36).substring(7);
      let isSimulated = true;

      if (resend) {
        try {
          const { data, error: resendError } = await resend.emails.send({
            from: `Blinq <${senderEmail}>`,
            to: [lead.email],
            subject: subject,
            text: emailBody,
            html: emailBody.replace(/\n/g, '<br />')
          });

          if (resendError) {
            throw resendError;
          }

          if (data) {
            messageId = data.id;
            isSimulated = false;
          }
        } catch (e: any) {
          console.error('Resend service error locally:', e);
        }
      }

      // Update draft locally
      localDb.updateDraft(leadId, {
        status: 'sent',
        sent_at: new Date().toISOString(),
        pitch_email: emailBody,
        subject: subject
      });

      // Update CRM status to contacted
      localDb.updateLeadCrm(leadId, {
        crm_status: 'contacted'
      });

      return NextResponse.json({ 
        success: true, 
        messageId, 
        simulated: isSimulated,
        message: isSimulated 
          ? `[Modo Sandbox] Simulación de correo enviado a ${lead.email} con éxito.`
          : `Correo enviado a ${lead.email} exitosamente a través de Resend.`
      });
    }

    // --- SUPABASE PROD FLOW ---
    // 1. Fetch Lead details
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('email, business_name')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
    }

    if (!lead.email) {
      return NextResponse.json({ error: 'This lead does not have a registered email address.' }, { status: 400 });
    }

    let messageId = 'simulated_id_' + Math.random().toString(36).substring(7);
    let isSimulated = true;

    // 2. Send via Resend if API key exists
    if (resend) {
      try {
        const { data, error: resendError } = await resend.emails.send({
          from: `Blinq <${senderEmail}>`,
          to: [lead.email],
          subject: subject,
          text: emailBody,
          html: emailBody.replace(/\n/g, '<br />')
        });

        if (resendError) {
          throw resendError;
        }

        if (data) {
          messageId = data.id;
          isSimulated = false;
        }
      } catch (e: any) {
        console.error('Resend service error, falling back to sandbox mode:', e);
      }
    } else {
      console.log(`[SANDBOX MODE] Simulating cold email to ${lead.email}`);
    }

    // 3. Update status in outreach_drafts
    const { error: draftError } = await supabase
      .from('outreach_drafts')
      .update({
        status: 'sent',
        contact_channel: 'email',
        sent_at: new Date().toISOString(),
        pitch_email: emailBody,
        subject: subject
      })
      .eq('lead_id', leadId);

    if (draftError) {
      throw draftError;
    }

    return NextResponse.json({ 
      success: true, 
      messageId, 
      simulated: isSimulated,
      message: isSimulated 
        ? `[Modo Sandbox] Simulación de correo enviado a ${lead.email} con éxito.`
        : `Correo enviado a ${lead.email} exitosamente a través de Resend.`
    });
  } catch (error: any) {
    console.error('Error sending outreach email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
