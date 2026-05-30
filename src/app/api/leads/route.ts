import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured, localDb } from '@/lib/dbFallback';

// GET: Fetch all leads (uses the PostgreSQL view or local db)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId') || undefined;
    const status = searchParams.get('status') || undefined;

    if (!isSupabaseConfigured()) {
      console.log('[LOCAL FALLBACK DB] Fetching leads locally.');
      const localLeads = localDb.getLeads(campaignId, status);
      return NextResponse.json(localLeads);
    }

    let query = supabase.from('v_leads_outreach').select('*');

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    if (status) {
      query = query.eq('draft_status', status);
    }

    const { data: leads, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json(leads);
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update draft copy or lead/draft status or CRM status/notes
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { leadId, draftStatus, subject, pitchEmail, pitchDm, contactChannel, crmStatus, crmNotes } = body;

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required.' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      console.log(`[LOCAL FALLBACK DB] Patching draft/lead locally for leadId: ${leadId}`);
      
      // Update draft updates if any
      const draftUpdates: any = {};
      if (draftStatus) draftUpdates.status = draftStatus;
      if (subject !== undefined) draftUpdates.subject = subject;
      if (pitchEmail !== undefined) draftUpdates.pitch_email = pitchEmail;
      if (pitchDm !== undefined) draftUpdates.pitch_dm = pitchDm;
      if (contactChannel !== undefined) draftUpdates.contact_channel = contactChannel;
      if (draftStatus === 'sent') {
        draftUpdates.sent_at = new Date().toISOString();
      }
      
      if (Object.keys(draftUpdates).length > 0) {
        localDb.updateDraft(leadId, draftUpdates);
      }

      // Update lead CRM properties if any
      const leadUpdates: any = {};
      if (crmStatus !== undefined) leadUpdates.crm_status = crmStatus;
      if (crmNotes !== undefined) leadUpdates.crm_notes = crmNotes;

      if (Object.keys(leadUpdates).length > 0) {
        localDb.updateLeadCrm(leadId, leadUpdates);
      }

      // Fetch the updated lead representation to return
      const allLeads = localDb.getLeads();
      const updatedLead = allLeads.find(l => l.lead_id === leadId);
      return NextResponse.json(updatedLead);
    }

    // --- SUPABASE PROD FLOW ---
    // Update lead table details if CRM status/notes are updated
    if (crmStatus !== undefined || crmNotes !== undefined) {
      const leadUpdates: any = {};
      if (crmStatus !== undefined) leadUpdates.crm_status = crmStatus;
      if (crmNotes !== undefined) leadUpdates.crm_notes = crmNotes;

      const { error: leadErr } = await supabase
        .from('leads')
        .update(leadUpdates)
        .eq('id', leadId);
      
      if (leadErr) {
        console.error('Error updating lead CRM details in Supabase:', leadErr);
      }
    }

    // Update draft details if any
    const draftUpdates: any = {};
    if (draftStatus) draftUpdates.status = draftStatus;
    if (subject !== undefined) draftUpdates.subject = subject;
    if (pitchEmail !== undefined) draftUpdates.pitch_email = pitchEmail;
    if (pitchDm !== undefined) draftUpdates.pitch_dm = pitchDm;
    if (contactChannel !== undefined) draftUpdates.contact_channel = contactChannel;
    
    if (draftStatus === 'sent') {
      draftUpdates.sent_at = new Date().toISOString();
    }

    if (Object.keys(draftUpdates).length > 0) {
      const { error: draftErr } = await supabase
        .from('outreach_drafts')
        .update(draftUpdates)
        .eq('lead_id', leadId);
      
      if (draftErr) {
        throw draftErr;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating lead draft:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
