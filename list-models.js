const fs = require('fs');
const path = require('path');

// Manually load env
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      if (parts[0] && parts[1]) {
        process.env[parts[0]] = parts.slice(1).join('=');
      }
    }
  });
}

const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  console.log('Querying available models for your Gemini API Key...');
  try {
    // In this version of the SDK, we can fetch models using a simple fetch call 
    // to the Google API endpoint, which is super stable and bypasses version mismatches
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await res.json();
    
    if (data.models) {
      console.log('\n--- Accessible Models ---');
      data.models.forEach(m => {
        if (m.supportedGenerationMethods.includes('generateContent')) {
          console.log(`- Model Name: ${m.name} (${m.displayName})`);
        }
      });
    } else {
      console.log('No models returned. API Response:', data);
    }
  } catch (e) {
    console.error('Error fetching models:', e);
  }
}

listModels();
