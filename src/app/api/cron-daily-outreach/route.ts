import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { runScrapingPipeline } from '@/lib/scraper';
import { isSupabaseConfigured, localDb } from '@/lib/dbFallback';

// GET/POST: Endpoint triggered by Vercel Cron daily at 12:00 PM
export async function GET(request: Request) {
  try {
    // Basic security token verification to prevent unauthorized external triggers
    const { searchParams } = new URL(request.url);
    const cronToken = searchParams.get('token');
    const secureToken = process.env.CRON_SECRET || 'blinq_secure_cron_token_123';

    if (cronToken !== secureToken && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized cron access.' }, { status: 401 });
    }

    let campaign;
    if (!isSupabaseConfigured()) {
      // Fetch first active campaign in local fallback DB
      const campaigns = localDb.getCampaigns();
      campaign = campaigns.find(c => c.status === 'active') || campaigns[0];
      
      // If no campaign exists, create a default active one
      if (!campaign) {
        campaign = localDb.createCampaign('Dentistas', 'Monterrey, MX');
      }
    } else {
      // Fetch the first active campaign in Supabase
      const { data, error: campError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (campError) {
        throw campError;
      }
      campaign = data;
    }

    if (!campaign) {
      return NextResponse.json({ 
        success: true, 
        message: 'No active outreach campaigns found to scrape.' 
      });
    }

    const campaignId = campaign.id;
    const niche = campaign.niche;
    const city = campaign.city;

    console.log(`[CRON TRIGGERED] Daily outreach starting for: ${niche} in ${city}`);

    // 2. Trigger scraper pipeline to get new leads for this campaign
    const scrapedCount = await runScrapingPipeline(
      campaignId,
      niche,
      city
    );

    return NextResponse.json({
      success: true,
      scrapedLeads: scrapedCount,
      message: `Daily cron executed. Scraped & generated copywriting drafts for ${scrapedCount} leads.`
    });
  } catch (error: any) {
    console.error('Error in Daily Cron Outreach:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Support POST requests as well
export async function POST(request: Request) {
  return GET(request);
}
