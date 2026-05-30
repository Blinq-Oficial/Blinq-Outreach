import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured, localDb } from '@/lib/dbFallback';

// GET: Fetch all campaigns
export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      console.log('[LOCAL FALLBACK DB] Fetching campaigns locally.');
      const localCampaigns = localDb.getCampaigns();
      return NextResponse.json(localCampaigns);
    }

    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(campaigns);
  } catch (error: any) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new campaign
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { niche, city } = body;

    if (!niche || !city) {
      return NextResponse.json({ error: 'Niche and City are required fields.' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      console.log(`[LOCAL FALLBACK DB] Creating campaign locally: ${niche} in ${city}`);
      const newCamp = localDb.createCampaign(niche, city);
      return NextResponse.json(newCamp, { status: 201 });
    }

    // Check if the exact campaign already exists
    const { data: existing } = await supabase
      .from('campaigns')
      .select('*')
      .eq('niche', niche.trim())
      .eq('city', city.trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    // Insert new campaign
    const { data: newCampaign, error } = await supabase
      .from('campaigns')
      .insert({
        niche: niche.trim(),
        city: city.trim(),
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(newCampaign, { status: 201 });
  } catch (error: any) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
