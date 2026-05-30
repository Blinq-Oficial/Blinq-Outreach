/**
 * Script de Simulación de Respuesta de Correo para Blinq Outreach Agent
 * 
 * Permite simular que David o cualquier cliente ha respondido al correo de prospección.
 * Esto inyecta una respuesta a través del endpoint local y actualiza automáticamente
 * el lead en el pipeline de localhost.
 */

const SENDER_EMAIL = 'david.aguirre.pulgarin@gmail.com';
const SENDER_NAME = 'David Aguirre';
const TARGET_API_URL = 'http://localhost:3000/api/replies';

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   BLINQ OUTREACH — SIMULADOR DE RESPUESTA         ║');
  console.log('║   Para pruebas rápidas de Inbound en localhost    ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  console.log(`📡 Enviando simulación de correo desde: ${SENDER_NAME} <${SENDER_EMAIL}>...`);

  const payload = {
    from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
    to: ['contacto@blinqoficial.com'],
    subject: 'Re: Propuesta de diseño web premium - Blinq',
    text: 'Hola Equipo Blinq,\n\nMe parece muy interesante la propuesta de rediseño móvil y la verificación de IA que mencionan. Sí, me gustaría ver ese boceto visual en Figma que ofrecen gratis y sin compromiso. ¿Cuándo lo tendrían listo?\n\nQuedo atento,\nDavid Aguirre',
    html: '<p>Hola Equipo Blinq,</p><p>Me parece muy interesante la propuesta de rediseño móvil y la verificación de IA que mencionan. Sí, me gustaría ver ese boceto visual en Figma que ofrecen gratis y sin compromiso. ¿Cuándo lo tendrían listo?</p><p>Quedo atento,<br/>David Aguirre</p>',
    date: new Date().toISOString()
  };

  try {
    const response = await fetch(TARGET_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    console.log('🎉 ¡SIMULACIÓN COMPLETADA CON ÉXITO!');
    console.log('─────────────────────────────────────────────────────');
    console.log(`✅ Correo registrado en base de datos local.`);
    console.log(`🔥 Si existe un lead asociado a "${SENDER_EMAIL}", se ha movido a la columna "Respondió" en tu Dashboard.`);
    console.log('─────────────────────────────────────────────────────');
    console.log('👉 Abre http://localhost:3000/ en tu navegador para ver la respuesta en tiempo real.\n');

  } catch (err) {
    console.error('\n❌ ERROR AL ENVIAR SIMULACIÓN:');
    console.error(err.message);
    console.log('\n💡 Asegúrate de que el servidor Next.js esté corriendo (npm run dev) en http://localhost:3000\n');
  }
}

main();
