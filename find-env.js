const fs = require('fs');
const path = require('path');

const parentDir = path.join(__dirname, '..');
console.log('Scanning parent directory:', parentDir);

function searchEnvFiles(dir, depth = 0) {
  if (depth > 3) return;
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        if (file.name !== 'node_modules' && file.name !== '.next' && file.name !== '.git') {
          searchEnvFiles(fullPath, depth + 1);
        }
      } else if (file.name === '.env' || file.name === '.env.local') {
        console.log(`Found env file: ${fullPath}`);
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
          if (line.includes('KEY') || line.includes('API') || line.includes('URL')) {
            const parts = line.split('=');
            if (parts[0] && parts[1]) {
              console.log(`  Variable: ${parts[0]} = ${parts[1].trim() ? '***hidden***' : 'empty'}`);
            }
          }
        }
      }
    }
  } catch (e) {
    // Ignore errors
  }
}

searchEnvFiles(parentDir);
