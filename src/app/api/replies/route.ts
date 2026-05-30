import { NextResponse } from 'next/server';
import { localDb } from '@/lib/dbFallback';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/dbFallback';

// GET /api/replies
// Returns a list of all replies received
export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      const replies = localDb.getReplies();
      return NextResponse.json(replies);
    }

    // Supabase prod flow
    const { data: replies, error } = await supabase
      .from('replies')
      .select('*')
      .order('received_at', { ascending: false });

    if (error) throw error;
    
    // Map to unified shape
    const mapped = replies.map((r: any) => ({
      id: r.id,
      from: r.from_email,
      to: r.to_emails,
      subject: r.subject,
      text: r.body_text,
      html: r.body_html,
      date: r.received_at,
      created_at: r.created_at
    }));
    
    return NextResponse.json(mapped);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/replies
// Injects a simulated reply manually (great for development & quick localhost test)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { from, to, subject, text, html, date } = body;

    if (!from || !text) {
      return NextResponse.json({ error: 'from and text fields are required.' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      const newReply = localDb.createReply({
        from,
        to: Array.isArray(to) ? to : [to || 'contacto@blinqoficial.com'],
        subject: subject || 'Simulated Subject',
        text,
        html: html || text,
        date: date || new Date().toISOString()
      });
      return NextResponse.json({ success: true, local: true, reply: newReply });
    }

    // Supabase simulation insertion
    const { data: newReply, error } = await supabase
      .from('replies')
      .insert({
        from_email: from,
        to_emails: Array.isArray(to) ? to : [to || 'contacto@blinqoficial.com'],
        subject: subject || 'Simulated Subject',
        body_text: text,
        body_html: html || text,
        received_at: date || new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger lead matching in Supabase
    const emailMatch = from.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      const email = emailMatch[0].toLowerCase();
      const { data: lead } = await supabase
        .from('leads')
        .select('id, crm_notes')
        .eq('email', email)
        .maybeSingle();

      if (lead) {
        const cleanText = text.substring(0, 150) + (text.length > 150 ? '...' : '');
        const newNotes = `[Inbound Simulation] Respuesta: "${cleanText}"\n${lead.crm_notes || ''}`;
        
        await supabase
          .from('leads')
          .update({ crm_status: 'replied', crm_notes: newNotes })
          .eq('id', lead.id);

        await supabase
          .from('outreach_drafts')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('lead_id', lead.id);
      }
    }

    return NextResponse.json({ success: true, supabase: true, reply: newReply });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
