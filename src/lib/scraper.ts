import * as cheerio from 'cheerio';
import { supabase } from './supabase';
import { generateOutreachPitch } from './gemini';
import { isSupabaseConfigured, localDb } from './dbFallback';

export interface ScrapedLead {
  businessName: string;
  website: string;
  hasWebsite: boolean;
  email?: string;
  phone?: string;
  instagram?: string;
  whatsapp?: string;
  googleRating?: number;
  websiteIssues: string[];
}

/**
 * Searches DuckDuckGo HTML to find local businesses websites.
 * Filters out large directories and aggregators to isolate local targets.
 */
export async function searchLocalBusinesses(niche: string, city: string): Promise<string[]> {
  const searchQuery = `${niche} in ${city}`;
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
      }
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo request failed with status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const urls: string[] = [];

    // Parse the organic search results
    $('a.result__url').each((_, element) => {
      let rawUrl = $(element).attr('href');
      if (rawUrl) {
        // Clean DuckDuckGo proxy redirect URLs
        if (rawUrl.includes('//duckduckgo.com/y.js?')) {
          const match = rawUrl.match(/uddg=([^&]+)/);
          if (match && match[1]) {
            rawUrl = decodeURIComponent(match[1]);
          }
        }
        
        try {
          const parsed = new URL(rawUrl);
          const domain = parsed.hostname.toLowerCase();
          
          // Exclude aggregators, directories, and giant networks
          const aggregators = [
            'yelp', 'tripadvisor', 'yellowpages', 'facebook', 'instagram', 'linkedin', 
            'twitter', 'youtube', 'maps.google', 'wikipedia', 'groupon', 'booking', 
            'foursquare', 'paginasamarillas', 'linkedin', 'github', 'pinterest',
            'duckduckgo', 'google', 'mercadolibre', 'amazon', 'ebay', 'eventbrite'
          ];
          
          const isAggregator = aggregators.some(agg => domain.includes(agg));
          
          if (!isAggregator && !urls.includes(rawUrl)) {
            urls.push(rawUrl);
          }
        } catch (e) {
          // Skip invalid URLs
        }
      }
    });

    return urls.slice(0, 10); // Return top 10 results for safety and speed
  } catch (error) {
    console.error('Error searching DuckDuckGo:', error);
    return [];
  }
}

/**
 * Crawls a single business website homepage to discover emails, phone numbers, and socials.
 */
export async function scrapeBusinessWebsite(urlStr: string): Promise<ScrapedLead> {
  const issues: string[] = [];
  let email: string | undefined;
  let instagram: string | undefined;
  let whatsapp: string | undefined;
  let phone: string | undefined;
  let businessName = '';
  
  try {
    const parsedUrl = new URL(urlStr);
    const domain = parsedUrl.hostname.replace('www.', '');
    businessName = domain.split('.')[0].replace(/-/g, ' ').replace(/_/g, ' ');
    businessName = businessName.replace(/\b\w/g, c => c.toUpperCase());

    const startTime = Date.now();
    const response = await fetch(urlStr, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(6000)
    });
    const duration = Date.now() - startTime;

    if (duration > 3500) {
      issues.push('Tiempo de carga lento (>3.5s)');
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Get page Title & check details
    const pageTitle = $('title').text().trim();
    if (pageTitle) {
      businessName = pageTitle.split('|')[0].split('-')[0].trim();
    } else {
      issues.push('Falta etiqueta Meta Title (SEO básico)');
    }

    // Check H1 elements
    if ($('h1').length === 0) {
      issues.push('Sin etiqueta de título principal H1');
    }

    // Check responsive viewport meta tag
    if (!$('meta[name="viewport"]').length) {
      issues.push('No está optimizado para dispositivos móviles');
    }

    // Basic email regex
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
    
    // Parse raw text for email
    const pageText = $('body').text();
    const foundEmails = pageText.match(emailRegex);
    if (foundEmails && foundEmails.length > 0) {
      email = foundEmails[0].toLowerCase();
    }

    // Search specifically in mailto: links
    $('a[href^="mailto:"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const mail = href.replace('mailto:', '').split('?')[0].trim();
      if (mail && mail.match(emailRegex)) {
        email = mail.toLowerCase();
      }
    });

    // Extract social networks
    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      
      // Instagram
      if (href.includes('instagram.com/')) {
        const parts = href.split('instagram.com/')[1]?.split('/')[0]?.split('?')[0];
        if (parts && parts !== 'p' && parts !== 'reels') {
          instagram = `https://instagram.com/${parts}`;
        }
      }
      
      // WhatsApp
      if (href.includes('wa.me/') || href.includes('api.whatsapp.com/send')) {
        const match = href.match(/(?:phone|send\?phone|wa\.me)\/([0-9+]+)/);
        if (match && match[1]) {
          whatsapp = `https://wa.me/${match[1].replace(/[+]/g, '')}`;
        }
      }

      // Telephone links
      if (href.startsWith('tel:')) {
        phone = href.replace('tel:', '').trim();
      }
    });

    // Try contact page if email is still missing
    if (!email) {
      const contactLinks: string[] = [];
      $('a').each((_, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().toLowerCase();
        if (text.includes('contact') || text.includes('escríbe') || text.includes('contacto')) {
          try {
            const absoluteContactUrl = new URL(href, urlStr).toString();
            if (!contactLinks.includes(absoluteContactUrl)) {
              contactLinks.push(absoluteContactUrl);
            }
          } catch (e) {
            // Ignore invalid URLs
          }
        }
      });

      if (contactLinks.length > 0) {
        const contactPageUrl = contactLinks[0];
        try {
          const contactResponse = await fetch(contactPageUrl, {
            signal: AbortSignal.timeout(4000)
          });
          const contactHtml = await contactResponse.text();
          const $c = cheerio.load(contactHtml);
          
          const contactEmails = $c('body').text().match(emailRegex);
          if (contactEmails && contactEmails.length > 0) {
            email = contactEmails[0].toLowerCase();
          }

          $c('a[href^="mailto:"]').each((_, el) => {
            const href = $c(el).attr('href') || '';
            const mail = href.replace('mailto:', '').split('?')[0].trim();
            if (mail && mail.match(emailRegex)) {
              email = mail.toLowerCase();
            }
          });
        } catch (e) {
          // Fail silently for contact subpage crawl
        }
      }
    }

    return {
      businessName,
      website: urlStr,
      hasWebsite: true,
      email,
      phone,
      instagram,
      whatsapp,
      websiteIssues: issues.length > 0 ? issues : ['Diseño web básico/anticuado']
    };
  } catch (error) {
    return {
      businessName: businessName || urlStr.replace('https://', '').replace('http://', '').split('/')[0],
      website: urlStr,
      hasWebsite: false,
      websiteIssues: ['El sitio web no responde o está inactivo (caído)'],
    };
  }
}

/**
 * Scrapes and processes leads for a specific campaign, enriches them with Gemini, and saves them.
 */
export async function runScrapingPipeline(campaignId: string, niche: string, city: string): Promise<number> {
  console.log(`Starting scraper for Niche: ${niche}, City: ${city}`);
  
  // 1. Search search engine for independent business domains
  const urls = await searchLocalBusinesses(niche, city);
  console.log(`Found ${urls.length} potential organic domains.`);
  
  let savedCount = 0;

  for (const url of urls) {
    try {
      if (!isSupabaseConfigured()) {
        // --- LOCAL FALLBACK DB FLOW ---
        const existing = localDb.getLeads(campaignId).find(l => l.website === url);
        if (existing) {
          console.log(`Skip duplicate local: ${url}`);
          continue;
        }

        const leadData = await scrapeBusinessWebsite(url);
        
        // STRICT EMAIL OUTREACH ONLY - SKIP LEADS WITHOUT EMAIL
        if (!leadData.email) {
          console.log(`[EMAIL FILTER] Skipping local lead without email: ${leadData.businessName}`);
          continue;
        }
        
        const newLead = localDb.createLead(campaignId, {
          business_name: leadData.businessName,
          phone: leadData.phone || null,
          email: leadData.email || null,
          website: leadData.website,
          has_website: leadData.hasWebsite,
          instagram: leadData.instagram || null,
          whatsapp: leadData.whatsapp || null,
          address: null,
          google_rating: leadData.googleRating || null,
          website_issues: leadData.websiteIssues
        });

        const pitch = await generateOutreachPitch({
          businessName: newLead.business_name,
          niche: niche,
          city: city,
          website: newLead.website,
          hasWebsite: newLead.has_website,
          websiteIssues: newLead.website_issues,
          googleRating: newLead.google_rating || undefined
        });

        const contactChannel = newLead.email ? 'email' : (newLead.instagram ? 'instagram' : 'whatsapp');

        localDb.createDraft(newLead.id, {
          subject: pitch.emailSubject,
          pitch_email: pitch.emailBody,
          pitch_dm: pitch.dmScript,
          contact_channel: contactChannel,
          status: 'pending_review',
          sent_at: null
        });

        savedCount++;
        console.log(`[LOCAL DB] Processed Lead #${savedCount}: ${newLead.business_name}`);
        
      } else {
        // --- SUPABASE PROD FLOW ---
        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .eq('campaign_id', campaignId)
          .eq('website', url)
          .maybeSingle();

        if (existing) {
          console.log(`Skip duplicate: ${url}`);
          continue;
        }

        const leadData = await scrapeBusinessWebsite(url);
        
        // STRICT EMAIL OUTREACH ONLY - SKIP LEADS WITHOUT EMAIL
        if (!leadData.email) {
          console.log(`[EMAIL FILTER] Skipping supabase lead without email: ${leadData.businessName}`);
          continue;
        }
        
        const { data: newLead, error: leadError } = await supabase.from('leads').insert({
            campaign_id: campaignId,
            business_name: leadData.businessName,
            phone: leadData.phone || null,
            email: leadData.email || null,
            website: leadData.website,
            has_website: leadData.hasWebsite,
            instagram: leadData.instagram || null,
            whatsapp: leadData.whatsapp || null,
            google_rating: leadData.googleRating || null,
            website_issues: leadData.websiteIssues
          })
          .select()
          .single();

        if (leadError || !newLead) {
          console.error('Error saving lead:', leadError);
          continue;
        }

        const pitch = await generateOutreachPitch({
          businessName: newLead.business_name,
          niche: niche,
          city: city,
          website: newLead.website,
          hasWebsite: newLead.has_website,
          websiteIssues: newLead.website_issues,
          googleRating: newLead.google_rating || undefined
        });

        const contactChannel = newLead.email ? 'email' : (newLead.instagram ? 'instagram' : 'whatsapp');
        
        const { error: draftError } = await supabase
          .from('outreach_drafts')
          .insert({
            lead_id: newLead.id,
            subject: pitch.emailSubject,
            pitch_email: pitch.emailBody,
            pitch_dm: pitch.dmScript,
            contact_channel: contactChannel,
            status: 'pending_review'
          });

        if (draftError) {
          console.error('Error saving draft:', draftError);
        } else {
          savedCount++;
          console.log(`Processed and saved Lead #${savedCount}: ${newLead.business_name}`);
        }
      }

      // Small delay between site crawls
      await new Promise(resolve => setTimeout(resolve, 1500));
      
    } catch (e) {
      console.error(`Error processing url ${url}:`, e);
    }
  }

  return savedCount;
}
