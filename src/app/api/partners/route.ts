import { NextResponse } from 'next/server';
import { localDb } from '@/lib/dbFallback';

// GET: Fetch all affiliate partners with calculated real-time statistics
export async function GET() {
  try {
    const partners = localDb.getPartners();
    const leads = localDb.getLeads();

    const partnersWithStats = partners.map(partner => {
      const referredLeads = leads.filter(l => l.referred_by === partner.id);
      const wonLeads = referredLeads.filter(l => l.crm_status === 'won');
      const activeLeads = referredLeads.filter(l => l.crm_status && ['contacted', 'replied', 'mockup_sent'].includes(l.crm_status));

      // Calculate commissions dynamically
      let usdCommission = 0;
      let copCommission = 0;

      referredLeads.forEach(lead => {
        if (lead.crm_status === 'won') {
          const notes = lead.crm_notes || '';
          
          // Pattern match to parse commission dynamically from notes
          const usdMatch = notes.match(/comisión\s*\$?(\d+)\s*usd/i);
          const copMatch = notes.match(/comisión\s*\$?([\d\.]+)\s*cop/i);

          if (usdMatch) {
            usdCommission += parseInt(usdMatch[1], 10);
          } else if (copMatch) {
            // Remove dots like 200.000 -> 200000
            const cleanCop = copMatch[1].replace(/\./g, '');
            copCommission += parseInt(cleanCop, 10);
          } else {
            // Default commissions fallback based on region
            const isCop = (lead.city || '').toLowerCase().includes('bogotá') || 
                          (lead.city || '').toLowerCase().includes('colombia') || 
                          notes.toLowerCase().includes('cop') ||
                          (lead.phone || '').startsWith('+57');
            if (isCop) {
              copCommission += 200000; // Default 200k COP commission
            } else {
              usdCommission += 70; // Default $70 USD commission
            }
          }
        }
      });

      return {
        ...partner,
        referredCount: referredLeads.length,
        wonCount: wonLeads.length,
        activeCount: activeLeads.length,
        commission: {
          usd: usdCommission,
          cop: copCommission
        }
      };
    });

    return NextResponse.json(partnersWithStats);
  } catch (error: any) {
    console.error('[API PARTNERS] Error compiling partner statistics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
