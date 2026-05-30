const fs = require('fs');
const path = require('path');

// 1. Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0];
      const val = parts.slice(1).join('=');
      if (key && val) {
        process.env[key] = val.trim();
      }
    }
  });
}

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_6FDNPXWp_BTCte5UrKDo2Uc6x4T3eAxr1';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'contacto@blinqoficial.com';
const SENDER_NAME = 'Blinq';

console.log('--- 📧 BLINQ 11 PREMIUM LEADS DISPATCHER ---');
console.log(`Resend API Key: ${RESEND_API_KEY ? 'Loaded ✅' : 'Missing ❌'}`);
console.log(`Sender Email: ${SENDER_EMAIL}`);

// Premium responsive dark-mode HTML template matching Blinq identity
function buildPremiumHtml(bodyText, businessName, city) {
  const formattedBody = bodyText.replace(/\n/g, '<br />');
  
  // Enforce correct pricing string dynamically
  const lowerCity = (city || '').toLowerCase();
  let pricingText = '$50 USD';
  if (lowerCity.includes('colombia') || lowerCity.includes('bogotá') || lowerCity.includes('bogota') || lowerCity.includes('medellín') || lowerCity.includes('medellin') || lowerCity.includes('co')) {
    pricingText = '$50 USD (o 200.000 COP)';
  } else if (lowerCity.includes('méxico') || lowerCity.includes('mexico') || lowerCity.includes('mx') || lowerCity.includes('monterrey') || lowerCity.includes('cdmx')) {
    pricingText = '$50 USD (o $1,000 MXN)';
  }

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #050508;
      color: #e4e4e7;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #050508;
      padding: 40px 0;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background: #090a10;
      border: 1px solid #1f2029;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(168, 85, 247, 0.05);
    }
    .header {
      padding: 32px 32px 10px 32px;
      text-align: left;
    }
    .logo {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.04em;
      color: #ffffff;
      text-decoration: none;
    }
    .logo-dot {
      color: #a855f7;
    }
    .content {
      padding: 24px 32px;
      font-size: 15px;
      line-height: 1.6;
      color: #d4d4d8;
    }
    .pricing-box {
      margin: 28px 0;
      padding: 16px 20px;
      background: linear-gradient(135deg, #090a10, #141520);
      border: 1px solid rgba(168, 85, 247, 0.25);
      border-radius: 10px;
      text-align: center;
    }
    .pricing-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #a855f7;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .pricing-value {
      font-size: 18px;
      font-weight: 800;
      color: #ffffff;
    }
    .pricing-badge {
      display: inline-block;
      margin-top: 8px;
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 99px;
    }
    .footer {
      padding: 24px 32px;
      background-color: #07070b;
      border-top: 1px solid #1f2029;
      font-size: 11px;
      color: #71717a;
      text-align: center;
      line-height: 1.5;
    }
    .footer a {
      color: #a855f7;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <span class="logo">Blinq<span class="logo-dot">.</span></span>
      </div>
      <div class="content">
        ${formattedBody}
        
        <div class="pricing-box">
          <div class="pricing-title">⚡ PLAN PROTOCOL IGNITION</div>
          <div class="pricing-value">${pricingText}</div>
          <div class="pricing-badge">Cero Anticipo · Entrega en 48h · Solo pagas si te encanta</div>
        </div>
      </div>
      <div class="footer">
        Enviado de forma segura por Blinq · <a href="https://blinqoficial.com">blinqoficial.com</a><br/>
        Si prefieres no recibir más análisis web, responde "no gracias".
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

// Deliver via Resend API
async function deliverEmail(to, subject, bodyText, businessName, city) {
  const htmlContent = buildPremiumHtml(bodyText, businessName, city);
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to: [to],
      subject: subject,
      text: bodyText,
      html: htmlContent
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || JSON.stringify(data));
  }
  return data;
}

async function sendOutbox() {
  const dbPath = path.join(__dirname, 'database_fallback.json');
  if (!fs.existsSync(dbPath)) {
    console.error('Database file database_fallback.json not found!');
    process.exit(1);
  }

  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  // Get all drafts in 'pending_review' status
  const pendingDrafts = db.drafts.filter(d => d.status === 'pending_review');

  if (pendingDrafts.length === 0) {
    console.log('No pending drafts to send.');
    process.exit(0);
  }

  console.log(`\n⏳ Pipelining outbox dispatch for ${pendingDrafts.length} pending premium leads...`);

  let sent = 0;
  let errors = 0;

  for (const draft of pendingDrafts) {
    const lead = db.leads.find(l => l.id === draft.lead_id);

    if (!lead) {
      console.log(`⚠️ Missing lead data for draft: ${draft.id}. Skipping.`);
      continue;
    }

    console.log(`\n📧 Dispatching cold email to: "${lead.business_name}" <${lead.email}>`);
    console.log(`   Contact Person: ${lead.crm_notes.match(/Contacto directo con ([^.]+)/)?.[1] || 'Negocio'}`);
    console.log(`   Subject: "${draft.subject}"`);

    try {
      const result = await deliverEmail(lead.email, draft.subject, draft.pitch_email, lead.business_name, lead.address);
      sent++;
      console.log(`   ✅ DISPATCH SUCCESS! Resend ID: ${result.id}`);

      // Update local database
      lead.crm_status = 'contacted';
      lead.crm_notes = `[Auto Outbox] Correo hiper-personalizado por nombre enviado vía Resend el ${new Date().toLocaleDateString()}. Resend ID: ${result.id}\n${lead.crm_notes || ''}`;
      
      draft.status = 'sent';
      draft.sent_at = new Date().toISOString();

      // Write back immediately to prevent loss in case of crash
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

      // Small delay between sends to respect deliverability and Resend rate limit
      await new Promise(r => setTimeout(r, 1200));

    } catch (e) {
      errors++;
      console.error(`   ❌ DISPATCH FAILURE: ${e.message}`);
    }
  }

  console.log(`\n--- 🏁 PIPELINE OUTBOX COMPLETED ---`);
  console.log(`🎉 Successful emails sent: ${sent}`);
  console.log(`⚠ Failed dispatches: ${errors}`);
  console.log(`🚀 All updates written to database_fallback.json!`);
}

sendOutbox();
