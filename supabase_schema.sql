-- Schema for Blinq Outreach Agent Database

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. CAMPAIGNS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    niche TEXT NOT NULL,                         -- e.g., "Dentistas", "Restaurantes"
    city TEXT NOT NULL,                          -- e.g., "Monterrey", "Miami"
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- =========================================================================
-- 2. LEADS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
    business_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    website TEXT,
    has_website BOOLEAN DEFAULT FALSE,
    instagram TEXT,
    whatsapp TEXT,
    address TEXT,
    google_rating NUMERIC(3, 2),                 -- e.g., 4.75
    website_issues TEXT[] DEFAULT '{}',          -- array of issues like 'no_mobile', 'slow_loading', 'missing_h1'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Unique index to prevent duplicate businesses in the same campaign (or globally)
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_campaign_business ON leads(campaign_id, business_name);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_campaign ON leads(campaign_id);

-- =========================================================================
-- 3. OUTREACH DRAFTS TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS outreach_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE UNIQUE NOT NULL,
    subject TEXT,                                -- for cold emails
    pitch_email TEXT NOT NULL,                   -- personalized cold email content
    pitch_dm TEXT NOT NULL,                      -- personalized ultra-short DM/WhatsApp script
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'sent')),
    contact_channel TEXT DEFAULT 'email' CHECK (contact_channel IN ('email', 'instagram', 'whatsapp')),
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_drafts_status ON outreach_drafts(status);
CREATE INDEX IF NOT EXISTS idx_drafts_lead ON outreach_drafts(lead_id);

-- =========================================================================
-- HELPER VIEW FOR OUTREACH WORKFLOW
-- =========================================================================
CREATE OR REPLACE VIEW v_leads_outreach AS
SELECT 
    l.id AS lead_id,
    l.business_name,
    l.phone,
    l.email,
    l.website,
    l.has_website,
    l.instagram,
    l.whatsapp,
    l.address,
    l.google_rating,
    l.website_issues,
    c.id AS campaign_id,
    c.niche,
    c.city,
    od.id AS draft_id,
    od.subject,
    od.pitch_email,
    od.pitch_dm,
    od.status AS draft_status,
    od.contact_channel,
    od.sent_at
FROM leads l
JOIN campaigns c ON l.campaign_id = c.id
LEFT JOIN outreach_drafts od ON l.id = od.lead_id;
