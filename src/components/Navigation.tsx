'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/',
      label: 'Dashboard',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9"></rect>
          <rect x="14" y="3" width="7" height="5"></rect>
          <rect x="14" y="12" width="7" height="9"></rect>
          <rect x="3" y="16" width="7" height="5"></rect>
        </svg>
      )
    },
    {
      href: '/inbox',
      label: 'Inbox',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
          <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
        </svg>
      )
    },
    {
      href: '/campaigns',
      label: 'Campañas',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
        </svg>
      )
    }
  ];

  return (
    <nav style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ul className="nav-list">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                {item.icon}
                <span className="nav-label">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* User Profile */}
      <div style={{
        marginTop: 'auto',
        padding: '0.85rem 0.5rem',
        borderTop: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <img 
            src="/logo.png" 
            alt="Blinq Logo" 
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              objectFit: 'cover',
              boxShadow: '0 0 12px rgba(168, 85, 247, 0.4)'
            }}
          />
          <div>
            <h5 style={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '-0.01em', color: '#ffffff' }}>Blinq Enterprise</h5>
            <p style={{ fontSize: '0.65rem', color: '#a855f7', fontWeight: 600 }}>AI Protocol Active ⚡</p>
          </div>
        </div>
      </div>
    </nav>
  );
}
