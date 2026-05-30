import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: "Blinq Outreach Agent | Inteligencia de Prospección",
  description: "Sistema inteligente de búsqueda, personalización y prospección híbrida para Blinq.",
  icons: {
    icon: "/favicon.ico",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="app-container">
          {/* Permanent Sidebar Navigation */}
          <aside className="sidebar">
            <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.85rem 0.5rem', marginBottom: '1.5rem' }}>
              <img 
                src="/logo.png" 
                alt="Blinq" 
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  boxShadow: '0 0 16px rgba(168, 85, 247, 0.45)'
                }}
              />
              <span className="logo-text" style={{
                fontFamily: 'var(--font-sans)',
                fontWeight: 900,
                fontSize: '1.25rem',
                letterSpacing: '-0.03em',
                background: 'linear-gradient(to right, #ffffff, #c084fc)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Blinq.
              </span>
            </div>

            <Navigation />
          </aside>

          {/* Main Layout Area */}
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
