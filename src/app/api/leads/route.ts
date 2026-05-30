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

    // --- AUTO-SYNC FROM JSON TO SUPABASE IF ACTIVE ---
    try {
      console.log('[AUTO-SYNC] Supabase is active. Syncing local leads to Supabase...');
      const fs = require('fs');
      const path = require('path');
      const DB_FILE = path.join(process.cwd(), 'database_fallback.json');
      
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf8');
        const db = JSON.parse(content);
        const localLeads = db.leads || [];
        const localDrafts = db.drafts || [];
        const localCampaigns = db.campaigns || [];
        
        for (const lead of localLeads) {
          // Check if website already exists in Supabase
          const { data: existingLead } = await supabase
            .from('leads')
            .select('id')
            .eq('website', lead.website)
            .maybeSingle();
            
          if (existingLead) {
            const draft = localDrafts.find((d: any) => d.lead_id === lead.id);
            if (draft) {
              const draftUpdates: any = {
                subject: draft.subject,
                pitch_email: draft.pitch_email,
                pitch_dm: draft.pitch_dm,
                status: draft.status
              };
              if (draft.status === 'sent') {
                draftUpdates.sent_at = draft.sent_at || new Date().toISOString();
              }
              
              await supabase
                .from('outreach_drafts')
                .update(draftUpdates)
                .eq('lead_id', existingLead.id);
                
              if (lead.crm_status === 'contacted') {
                await supabase
                  .from('leads')
                  .update({
                    crm_status: 'contacted',
                    crm_notes: lead.crm_notes
                  })
                  .eq('id', existingLead.id);
              }
            }
          } else {
            console.log(`[AUTO-SYNC] Syncing lead: ${lead.business_name} (${lead.website})`);
            const localCamp = localCampaigns.find((c: any) => c.id === lead.campaign_id);
            const niche = localCamp?.niche || 'Dentistas';
            const city = localCamp?.city || 'Monterrey';
            
            // 1. Get or create matching campaign in Supabase with a valid UUID
            let campaignUUID = '';
            const { data: existingCamp } = await supabase
              .from('campaigns')
              .select('id')
              .eq('niche', niche)
              .eq('city', city)
              .maybeSingle();
              
            if (existingCamp) {
              campaignUUID = existingCamp.id;
            } else {
              const { data: newCamp, error: campErr } = await supabase
                .from('campaigns')
                .insert({ niche, city, status: 'active' })
                .select()
                .single();
                
              if (newCamp && !campErr) {
                campaignUUID = newCamp.id;
              } else {
                console.error('[AUTO-SYNC] Failed to create campaign in Supabase:', campErr);
                continue;
              }
            }
            
            // 2. Insert Lead into Supabase
            const { data: newLead, error: leadError } = await supabase
              .from('leads')
              .insert({
                campaign_id: campaignUUID,
                business_name: lead.business_name,
                phone: lead.phone,
                email: lead.email,
                website: lead.website,
                has_website: lead.has_website,
                instagram: lead.instagram,
                whatsapp: lead.whatsapp,
                address: lead.address,
                google_rating: lead.google_rating,
                website_issues: lead.website_issues
              })
              .select()
              .single();
              
            if (leadError) {
              console.error(`[AUTO-SYNC] Error inserting lead ${lead.business_name}:`, leadError);
              continue;
            }
            
            if (newLead) {
              // 3. Find corresponding draft and insert it into outreach_drafts
              const draft = localDrafts.find((d: any) => d.lead_id === lead.id);
              if (draft) {
                const { error: draftError } = await supabase
                  .from('outreach_drafts')
                  .insert({
                    lead_id: newLead.id,
                    subject: draft.subject,
                    pitch_email: draft.pitch_email,
                    pitch_dm: draft.pitch_dm,
                    status: draft.status || 'pending_review',
                    contact_channel: draft.contact_channel || 'email',
                    sent_at: draft.sent_at
                  });
                  
                if (draftError) {
                  console.error(`[AUTO-SYNC] Error inserting draft for ${lead.business_name}:`, draftError);
                } else {
                  console.log(`[AUTO-SYNC] Successfully synced lead and draft for: ${lead.business_name}`);
                }
              }
            }
          }
        }
      }
    } catch (syncErr) {
      console.error('[AUTO-SYNC] Exception during auto-sync:', syncErr);
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
