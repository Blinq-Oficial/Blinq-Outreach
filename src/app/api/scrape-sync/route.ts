import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { runScrapingPipeline } from '@/lib/scraper';

// POST: Trigger scraping pipeline for a campaign
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { campaignId } = body;

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID is required.' }, { status: 400 });
    }

    // 1. Fetch campaign details
    const { data: campaign, error: campError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
    }

    // 2. Run the scraping pipeline (searches, parses, analyzes with Gemini, and saves to DB)
    const newLeadsCount = await runScrapingPipeline(
      campaign.id,
      campaign.niche,
      campaign.city
    );

    // 3. If leads were successfully found, we can mark campaign as completed or keep active
    if (newLeadsCount > 0) {
      await supabase
        .from('campaigns')
        .update({ status: 'active' }) // Ensure status is active
        .eq('id', campaignId);
    }

    return NextResponse.json({ 
      success: true, 
      scrapedLeads: newLeadsCount,
      message: `Successfully scraped and personalized ${newLeadsCount} new leads.`
    });
  } catch (error: any) {
    console.error('Error in scrape-sync API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
