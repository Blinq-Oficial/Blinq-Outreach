import { NextResponse } from 'next/server';
import { runScrapingPipeline } from '@/lib/scraper';
import { localDb } from '@/lib/dbFallback';

// ============================================================
// Default target cities across LATAM and North America
// ============================================================
export const DEFAULT_CITIES: { city: string; country: string }[] = [
  // Mexico
  { city: 'Monterrey, MX', country: 'MX' },
  { city: 'Ciudad de México, MX', country: 'MX' },
  { city: 'Guadalajara, MX', country: 'MX' },
  { city: 'Querétaro, MX', country: 'MX' },
  { city: 'Puebla, MX', country: 'MX' },
  { city: 'Tijuana, MX', country: 'MX' },
  { city: 'Mérida, MX', country: 'MX' },
  { city: 'Cancún, MX', country: 'MX' },
  { city: 'León, MX', country: 'MX' },
  { city: 'San Luis Potosí, MX', country: 'MX' },
  // Colombia
  { city: 'Bogotá, CO', country: 'CO' },
  { city: 'Medellín, CO', country: 'CO' },
  { city: 'Cali, CO', country: 'CO' },
  { city: 'Barranquilla, CO', country: 'CO' },
  { city: 'Cartagena, CO', country: 'CO' },
  { city: 'Bucaramanga, CO', country: 'CO' },
  // USA
  { city: 'Miami, US', country: 'US' },
  { city: 'Houston, US', country: 'US' },
  { city: 'Los Angeles, US', country: 'US' },
  { city: 'New York, US', country: 'US' },
  { city: 'Chicago, US', country: 'US' },
  { city: 'San Antonio, US', country: 'US' },
  { city: 'Dallas, US', country: 'US' },
  // Canada
  { city: 'Toronto, CA', country: 'CA' },
  { city: 'Vancouver, CA', country: 'CA' },
  { city: 'Montreal, CA', country: 'CA' },
  // Other LATAM
  { city: 'Lima, PE', country: 'PE' },
  { city: 'Santiago, CL', country: 'CL' },
  { city: 'Buenos Aires, AR', country: 'AR' },
  { city: 'São Paulo, BR', country: 'BR' },
  { city: 'Santo Domingo, DO', country: 'DO' },
  { city: 'San José, CR', country: 'CR' },
  { city: 'Panamá, PA', country: 'PA' },
  { city: 'Quito, EC', country: 'EC' },
];

interface SearchTarget {
  niche: string;
  city: string;
}

// --- Utility: delay ---
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// POST /api/expand-search
// Accepts { targets: [{niche, city}] } or uses defaults
// Runs scraping pipeline for each target and saves to local DB
// ============================================================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    let targets: SearchTarget[] = body.targets || [];

    // If no targets provided, use defaults with a default niche
    if (targets.length === 0) {
      const defaultNiche = body.niche || 'Dentistas';
      targets = DEFAULT_CITIES.map(c => ({
        niche: defaultNiche,
        city: c.city
      }));
    }

    // Validate targets
    const validTargets = targets.filter(t => t.niche && t.city);
    if (validTargets.length === 0) {
      return NextResponse.json(
        { error: 'No valid targets provided. Each target needs "niche" and "city".' },
        { status: 400 }
      );
    }

    const results: {
      niche: string;
      city: string;
      campaignId: string;
      leadsFound: number;
      status: 'success' | 'error';
      error?: string;
    }[] = [];
    let totalNewLeads = 0;

    for (const target of validTargets) {
      try {
        // Get or create campaign for this niche+city combo
        const campaign = localDb.createCampaign(target.niche, target.city);
        
        console.log(`[EXPAND] 🔍 Searching: "${target.niche}" in "${target.city}" (campaign: ${campaign.id})`);
        
        const leadsFound = await runScrapingPipeline(campaign.id, target.niche, target.city);
        
        totalNewLeads += leadsFound;
        results.push({
          niche: target.niche,
          city: target.city,
          campaignId: campaign.id,
          leadsFound,
          status: 'success'
        });

        console.log(`[EXPAND] ✅ Found ${leadsFound} new leads for "${target.niche}" in "${target.city}"`);

        // Small delay between searches to avoid being rate-limited by DuckDuckGo
        await delay(2000);

      } catch (err: any) {
        results.push({
          niche: target.niche,
          city: target.city,
          campaignId: '',
          leadsFound: 0,
          status: 'error',
          error: err.message || 'Unknown error'
        });
        console.error(`[EXPAND] ❌ Error for "${target.niche}" in "${target.city}":`, err.message);
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      total_new_leads: totalNewLeads,
      targets_processed: validTargets.length,
      successful: successCount,
      errors: errorCount,
      message: `Búsqueda expandida completada: ${totalNewLeads} nuevos leads en ${successCount} ciudades.`,
      results
    });

  } catch (error: any) {
    console.error('[EXPAND SEARCH] Critical error:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET: Return the default city list and current lead counts
export async function GET() {
  try {
    const allLeads = localDb.getLeads();
    const campaigns = localDb.getCampaigns();

    return NextResponse.json({
      default_cities: DEFAULT_CITIES,
      total_cities: DEFAULT_CITIES.length,
      current_campaigns: campaigns.length,
      current_leads: allLeads.length,
      leads_with_email: allLeads.filter(l => l.email).length,
      leads_without_email: allLeads.filter(l => !l.email).length
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
