import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { localDb } from '@/lib/dbFallback';

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_6FDNPXWp_BTCte5UrKDo2Uc6x4T3eAxr1';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'contacto@blinqoficial.com';
const SENDER_NAME = 'Blinq Oficial';
const MAX_SENDS_PER_BATCH = 100;
const DELAY_BETWEEN_SENDS_MS = 1100; // 1.1s to stay safely under Resend rate limits

// --- Country/Region Detection from city string ---
interface RegionInfo {
  region: 'MX' | 'CO' | 'US' | 'CA' | 'LATAM';
  pricingLine: string;
}

const MEXICO_CITIES = [
  'monterrey', 'cdmx', 'ciudad de méxico', 'ciudad de mexico', 'guadalajara',
  'queretaro', 'querétaro', 'puebla', 'tijuana', 'mérida', 'merida', 'cancún',
  'cancun', 'león', 'leon', 'oaxaca', 'playa del carmen', 'san luis potosí',
  'san luis potosi', 'aguascalientes', 'toluca', 'chihuahua', 'hermosillo',
  'saltillo', 'mexicali', 'culiacán', 'culiacan', 'morelia', 'veracruz',
  'villahermosa', 'tuxtla', 'tampico', 'mazatlán', 'mazatlan', 'pachuca',
  'cuernavaca', 'celaya', 'irapuato', 'durango', 'zacatecas', 'reynosa',
  'matamoros', 'nuevo laredo', 'juarez', 'juárez', 'nogales', 'ensenada',
  'colima', 'campeche', 'chetumal', 'tapachula'
];

const COLOMBIA_CITIES = [
  'bogotá', 'bogota', 'medellín', 'medellin', 'cali', 'barranquilla',
  'cartagena', 'bucaramanga', 'pereira', 'manizales', 'santa marta',
  'ibagué', 'ibague', 'pasto', 'montería', 'monteria', 'neiva',
  'villavicencio', 'armenia', 'popayán', 'popayan', 'cúcuta', 'cucuta',
  'tunja', 'sincelejo', 'valledupar', 'riohacha', 'quibdó', 'quibdo'
];

const USA_CITIES = [
  'new york', 'los angeles', 'chicago', 'houston', 'phoenix', 'philadelphia',
  'san antonio', 'san diego', 'dallas', 'san jose', 'austin', 'jacksonville',
  'fort worth', 'columbus', 'charlotte', 'san francisco', 'indianapolis',
  'seattle', 'denver', 'washington', 'nashville', 'oklahoma', 'el paso',
  'boston', 'portland', 'las vegas', 'memphis', 'louisville', 'baltimore',
  'milwaukee', 'albuquerque', 'tucson', 'fresno', 'sacramento', 'mesa',
  'kansas city', 'atlanta', 'omaha', 'colorado springs', 'raleigh', 'miami',
  'cleveland', 'tulsa', 'tampa', 'oakland', 'minneapolis', 'arlington',
  'bakersfield', 'aurora', 'anaheim', 'honolulu', 'riverside', 'stockton',
  'corpus christi', 'pittsburgh', 'cincinnati', 'st. louis', 'detroit',
  'orlando', 'new orleans'
];

const CANADA_CITIES = [
  'toronto', 'montreal', 'vancouver', 'calgary', 'edmonton', 'ottawa',
  'winnipeg', 'quebec', 'hamilton', 'kitchener', 'london', 'victoria',
  'halifax', 'oshawa', 'windsor', 'saskatoon', 'regina', 'st. john',
  'barrie', 'kelowna', 'abbotsford', 'sudbury', 'kingston', 'thunder bay'
];

function detectRegion(city: string): RegionInfo {
  const cityLower = city.toLowerCase();

  // Check explicit country suffixes first
  if (cityLower.includes(', mx') || cityLower.includes('mexico') || cityLower.includes('méxico')) {
    return { region: 'MX', pricingLine: '$50 USD / $1,000 MXN' };
  }
  if (cityLower.includes(', co') || cityLower.includes('colombia')) {
    return { region: 'CO', pricingLine: '$50 USD / 200,000 COP' };
  }
  if (cityLower.includes(', us') || cityLower.includes('usa') || cityLower.includes('united states')) {
    return { region: 'US', pricingLine: '$50 USD' };
  }
  if (cityLower.includes(', ca') || cityLower.includes('canada') || cityLower.includes('canadá')) {
    return { region: 'CA', pricingLine: '$50 USD' };
  }

  // Check city name lists
  if (MEXICO_CITIES.some(c => cityLower.includes(c))) {
    return { region: 'MX', pricingLine: '$50 USD / $1,000 MXN' };
  }
  if (COLOMBIA_CITIES.some(c => cityLower.includes(c))) {
    return { region: 'CO', pricingLine: '$50 USD / 200,000 COP' };
  }
  if (USA_CITIES.some(c => cityLower.includes(c))) {
    return { region: 'US', pricingLine: '$50 USD' };
  }
  if (CANADA_CITIES.some(c => cityLower.includes(c))) {
    return { region: 'CA', pricingLine: '$50 USD' };
  }

  // Default for other LATAM
  return { region: 'LATAM', pricingLine: '$50 USD' };
}

// --- Email HTML builder ---
function buildEmailHtml(pitchEmail: string, businessName: string, pricingLine: string): string {
  // Replace plain \n with <br /> for HTML rendering, and inject pricing footer
  const bodyHtml = pitchEmail.replace(/\n/g, '<br />');
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Propuesta para ${businessName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; line-height: 1.6; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .body-text { font-size: 15px; color: #333; }
    .pricing-badge { margin-top: 20px; padding: 12px 16px; background: linear-gradient(135deg, #0a0a0a, #1a1a2e); color: #fff; border-radius: 6px; font-size: 14px; text-align: center; }
    .pricing-badge strong { color: #4ade80; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #888; text-align: center; }
    .footer a { color: #2563eb; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="body-text">${bodyHtml}</div>
    <div class="pricing-badge">
      ⚡ Plan PROTOCOL IGNITION — <strong>${pricingLine}</strong> — Entrega en 48h — $0 anticipo
    </div>
    <div class="footer">
      <a href="https://blinqoficial.com">blinqoficial.com</a> · Blinq Oficial<br/>
      Si no deseas recibir más correos, simplemente responde "no gracias".
    </div>
  </div>
</body>
</html>`.trim();
}

// --- Utility: delay ---
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// POST /api/batch-send
// Sends emails to all unsent leads that have email addresses
// ============================================================
export async function POST() {
  try {
    const resend = new Resend(RESEND_API_KEY);
    
    // Get ALL leads, then filter to those with email + not yet sent
    const allLeads = localDb.getLeads();
    const unsentLeads = allLeads.filter(
      lead => lead.email && lead.draft_status !== 'sent'
    );

    if (unsentLeads.length === 0) {
      return NextResponse.json({
        sent: 0,
        errors: 0,
        message: 'No hay leads pendientes de envío con email.',
        details: []
      });
    }

    // Cap at MAX_SENDS_PER_BATCH per call
    const batch = unsentLeads.slice(0, MAX_SENDS_PER_BATCH);
    
    const details: { leadId: string; email: string; businessName: string; status: 'sent' | 'error'; error?: string }[] = [];
    let sentCount = 0;
    let errorCount = 0;

    for (const lead of batch) {
      try {
        const region = detectRegion(lead.city);
        const subject = lead.subject || `Propuesta de diseño web para ${lead.business_name}`;
        const emailBodyText = lead.pitch_email || `Hola, tenemos una propuesta para ${lead.business_name}.`;
        const htmlContent = buildEmailHtml(emailBodyText, lead.business_name, region.pricingLine);

        const { data, error: resendError } = await resend.emails.send({
          from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
          to: [lead.email!],
          subject,
          text: emailBodyText,
          html: htmlContent
        });

        if (resendError) {
          throw new Error(resendError.message || 'Resend API error');
        }

        // Mark draft as sent
        localDb.updateDraft(lead.lead_id, {
          status: 'sent',
          sent_at: new Date().toISOString()
        });

        // Update CRM status
        localDb.updateLeadCrm(lead.lead_id, {
          crm_status: 'contacted'
        });

        sentCount++;
        details.push({
          leadId: lead.lead_id,
          email: lead.email!,
          businessName: lead.business_name,
          status: 'sent'
        });

        console.log(`[BATCH] ✅ Sent to ${lead.email} (${lead.business_name}) — ID: ${data?.id}`);

      } catch (err: any) {
        errorCount++;
        details.push({
          leadId: lead.lead_id,
          email: lead.email!,
          businessName: lead.business_name,
          status: 'error',
          error: err.message || 'Unknown error'
        });
        console.error(`[BATCH] ❌ Failed for ${lead.email}: ${err.message}`);
      }

      // Rate-limit delay between sends
      await delay(DELAY_BETWEEN_SENDS_MS);
    }

    return NextResponse.json({
      sent: sentCount,
      errors: errorCount,
      total_unsent_remaining: Math.max(0, unsentLeads.length - batch.length),
      message: `Batch completado: ${sentCount} enviados, ${errorCount} errores.`,
      details
    });

  } catch (error: any) {
    console.error('[BATCH SEND] Critical error:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET: Check how many unsent leads are queued
export async function GET() {
  try {
    const allLeads = localDb.getLeads();
    const unsentWithEmail = allLeads.filter(
      lead => lead.email && lead.draft_status !== 'sent'
    );
    const sentLeads = allLeads.filter(lead => lead.draft_status === 'sent');

    return NextResponse.json({
      total_leads: allLeads.length,
      unsent_with_email: unsentWithEmail.length,
      already_sent: sentLeads.length,
      max_per_batch: MAX_SENDS_PER_BATCH,
      ready: unsentWithEmail.length > 0
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
