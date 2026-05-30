/**
 * Script: Limpiar base de datos local fallback
 * 
 * Elimina todos los leads mock y placeholders generados anteriormente
 * (que daban rebotes / Delivery Delayed) para dejar el Dashboard impecable,
 * conservando únicamente a David Aguirre (test lead) y leads reales cualificados.
 */

const fs = require('fs');
const path = require('path');
const DB_FILE = path.join(__dirname, 'database_fallback.json');

function loadDb() {
  if (fs.existsSync(DB_FILE)) {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  }
  return { campaigns: [], leads: [], drafts: [], replies: [] };
}

function saveDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function main() {
  console.log('🧹 Purgando base de datos local de leads mock...');
  
  const db = loadDb();
  const initialLeadsCount = db.leads.length;
  const initialDraftsCount = db.drafts.length;

  // Keep only David Aguirre and leads that have real websites/emails
  // Filtering out those generated with mock patterns (like .com.mx mock domains and "Lalalala" names)
  db.leads = db.leads.filter(lead => {
    const isMock = lead.business_name.includes('Querétaro') || 
                   lead.business_name.includes('Medellín') || 
                   lead.business_name.includes('Cali') || 
                   lead.business_name.includes('Bogotá') || 
                   lead.business_name.includes('Guadalajara') || 
                   lead.business_name.includes('Puebla') ||
                   (lead.email && lead.email.includes('com.mx') && !lead.email.includes('dentacare'));
    return !isMock || lead.email === 'david.aguirre.pulgarin@gmail.com';
  });

  // Keep drafts only for the remaining leads
  const remainingLeadIds = db.leads.map(l => l.id);
  db.drafts = db.drafts.filter(draft => remainingLeadIds.includes(draft.lead_id));

  saveDb(db);

  console.log(`\n🎉 BASE DE DATOS PURGADA CON ÉXITO!`);
  console.log('───────────────────────────────────────');
  console.log(`❌ Leads mock eliminados:  ${initialLeadsCount - db.leads.length}`);
  console.log(`❌ Drafts mock eliminados: ${initialDraftsCount - db.drafts.length}`);
  console.log(`✅ Leads reales conservados: ${db.leads.length}`);
  console.log('───────────────────────────────────────\n');
}

main();
