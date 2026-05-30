const fs = require('fs');
const path = require('path');

console.log('--- ENVIROMENT DIAGNOSTIC ---');
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
console.log('SUPABASE_KEY exists:', !!process.env.SUPABASE_KEY || !!process.env.SUPABASE_SERVICE_ROLE_KEY);

const envVars = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  SENDER_EMAIL: 'onboarding@resend.dev'
};

// Write to .env.local in next.js root
const envContent = Object.entries(envVars)
  .map(([k, v]) => `${k}=${v}`)
  .join('\n');

fs.writeFileSync(path.join(__dirname, '.env.local'), envContent);
console.log('.env.local file has been successfully prepared.');
