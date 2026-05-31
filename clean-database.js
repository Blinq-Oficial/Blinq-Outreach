const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database_fallback.json');
if (!fs.existsSync(dbPath)) {
  console.error('Database file not found!');
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// The 11 premium real business websites and emails
const realEmails = [
  'contacto@dentacare.com.mx',
  'info@dentalcumbres.mx',
  'info@mantramindbodyspa.com',
  'clientes@casaazulspa.mx',
  'hola@dentalia.com',
  'contacto@dentalmedics.mx',
  'recepcion@zenurbanospa.co',
  'contacto@dentalia.com.mx',
  'citas@kavaliadental.mx',
  'info@boutiquedental.mx',
  'consultas@dramariajosesilva.cl',
  // Original seeds
  'david.aguirre.pulgarin@gmail.com',
  'info@dentavacation.com',
  '605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com',
  'press@wellhub.com'
];

console.log('--- DB CLEANUP PROCESS ---');
console.log('Original leads count:', db.leads.length);
console.log('Original drafts count:', db.drafts.length);

// Filter leads: Keep only real emails
const cleanedLeads = db.leads.filter(l => {
  if (!l.email) return true; // Keep leads without email (if any original seed)
  return realEmails.some(re => l.email.toLowerCase() === re.toLowerCase());
});

// Filter drafts: Keep only drafts linked to cleaned leads
const cleanedLeadIds = cleanedLeads.map(l => l.id);
const cleanedDrafts = db.drafts.filter(d => cleanedLeadIds.includes(d.lead_id));

console.log('\nCleaned leads count:', cleanedLeads.length);
console.log('Cleaned drafts count:', cleanedDrafts.length);

db.leads = cleanedLeads;
db.drafts = cleanedDrafts;

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log('\nDatabase database_fallback.json has been successfully cleaned and restored to 100% REAL leads!');
