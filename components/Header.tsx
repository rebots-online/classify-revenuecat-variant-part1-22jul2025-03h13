/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import React, { useState, useEffect, useRef } from 'react';
import { AppConfig } from '@/App'; // Import AppConfig type

interface HeaderProps {
  siteTitle: string;
  subTitle: string;
  showLlmLogPanel: boolean;
  onToggleLlmLogPanel: () => void;
  onToggleHowToUse: () => void;
  config: AppConfig | null;
  revenueCatEnabled?: boolean;
  credits?: number;
  onGetCredits?: () => void;
  loggedInUser: string | null;
  onLogin: () => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  siteTitle, 
  subTitle, 
  showLlmLogPanel, 
  onToggleLlmLogPanel, 
  onToggleHowToUse, 
  config,
  revenueCatEnabled,
  credits,
  onGetCredits,
  loggedInUser,
  onLogin,
  onLogout
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileButtonRef = useRef<HTMLButtonElement>(null);

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);

  const menuItems = config?.menuLinks || [];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  const truncatePubKey = (pubkey: string) => `${pubkey.slice(0, 6)}...${pubkey.slice(-4)}`;

  // Click outside handler for BOTH menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close mobile menu
      if (isMobileMenuOpen &&
          mobileMenuRef.current && 
          !mobileMenuRef.current.contains(event.target as Node) &&
          mobileButtonRef.current &&
          !mobileButtonRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
      // Close user menu
      if (isUserMenuOpen &&
          userMenuRef.current && 
          !userMenuRef.current.contains(event.target as Node) &&
          userButtonRef.current &&
          !userButtonRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen, isUserMenuOpen]);

  return (
    <>
      <header className={`app-header ${isMobileMenuOpen ? 'nav-open' : ''}`}>
        <div className="header-content">
          <div className="title-container">
            <h1 className="headline header-headline">{siteTitle}</h1>
            <p className="subtitle header-subtitle">{subTitle}</p>
          </div>
          <div className="header-actions">
            {revenueCatEnabled && (
              <>
                <div className="credit-balance-display" title={`${credits?.toLocaleString()} Credits Available`}>
                  <span className="material-symbols-outlined credit-icon">monetization_on</span>
                  <span className="credit-amount">{credits?.toLocaleString() ?? '...'}</span>
                  <button onClick={onGetCredits} className="get-credits-button" title="Get More Credits">
                    <span className="material-symbols-outlined">add</span>
                  </button>
                </div>

                <div className="user-session-control">
                  {loggedInUser ? (
                    <div className="user-menu-container">
                      <button ref={userButtonRef} onClick={() => setIsUserMenuOpen(prev => !prev)} className="user-menu-button" title={loggedInUser}>
                          <span className="material-symbols-outlined">account_circle</span>
                          <span className="user-menu-name">{truncatePubKey(loggedInUser)}</span>
                      </button>
                      {isUserMenuOpen && (
                          <div ref={userMenuRef} className="user-dropdown-menu">
                              <div className="user-dropdown-header">
                                  Signed in as
                                  <strong title={loggedInUser}>{truncatePubKey(loggedInUser)}</strong>
                              </div>
                              <button onClick={onLogout} className="user-dropdown-item">
                                  <span className="material-symbols-outlined">logout</span>
                                  Logout
                              </button>
                          </div>
                      )}
                    </div>
                  ) : (
                    <button onClick={onLogin} className="login-button button-secondary">
                        <span className="material-symbols-outlined">bolt</span>
                        <span className="button-text-desktop">Login</span>
                    </button>
                  )}
                </div>
              </>
            )}
            <button
              onClick={onToggleLlmLogPanel}
              className="llm-log-toggle button-secondary"
              title={showLlmLogPanel ? "Hide LLM Log" : "Show LLM Log"}
              aria-pressed={showLlmLogPanel}
            >
              <span className="material-symbols-outlined">
                {showLlmLogPanel ? 'terminal_off' : 'terminal'}
              </span>
              <span className="button-text-desktop">LLM Log</span>
            </button>
            <nav className="desktop-nav">
              <ul>
                {menuItems.map((item) => (
                  <li key={item.name}><a href={item.href}>{item.name}</a></li>
                ))}
                <li><button onClick={onToggleHowToUse} className="nav-button">Help / Instructions</button></li>
              </ul>
            </nav>
            <button
              ref={mobileButtonRef}
              className="hamburger-button"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
          </div>
        </div>
        {isMobileMenuOpen && (
          <nav id="mobile-menu" className="mobile-nav" ref={mobileMenuRef}>
            <ul>
              {menuItems.map((item) => (
                <li key={item.name}><a href={item.href} onClick={() => setIsMobileMenuOpen(false)}>{item.name}</a></li>
              ))}
               <li><button onClick={() => { onToggleHowToUse(); setIsMobileMenuOpen(false); }} className="nav-button-mobile">Help / Instructions</button></li>
            </ul>
             <li className="mobile-nav-llm-toggle">
                <button
                onClick={() => { onToggleLlmLogPanel(); setIsMobileMenuOpen(false); }}
                className="llm-log-toggle-mobile"
                aria-pressed={showLlmLogPanel}
                >
                <span className="material-symbols-outlined">
                    {showLlmLogPanel ? 'terminal_off' : 'terminal'}
                </span>
                {showLlmLogPanel ? "Hide LLM Log" : "Show LLM Log"}
                </button>
            </li>
          </nav>
        )}
      </header>
      <style>{`
        .app-header {
          background-color: var(--color-background-header, light-dark(#fff, #2c2c30));
          border-bottom: 1px solid light-dark(#e0e0e0, #3a3a3f);
          padding: 0.5rem 1rem; /* Reduced padding */
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          z-index: 1000;
          box-sizing: border-box;
          height: var(--header-height);
        }
        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1400px;
          margin: 0 auto;
          height: 100%;
        }
        .title-container {
          display: flex;
          flex-direction: column;
          justify-content: center; /* Center titles vertically */
           flex-grow: 1;
           margin-left: 0.5rem; /* Add some space if logo is removed */
        }
        .headline.header-headline {
          font-size: 1.5rem; /* Adjusted font size */
          color: var(--color-headline);
          font-family: var(--font-display);
          text-transform: uppercase;
          margin: 0;
          line-height: 1.1;
        }
        .subtitle.header-subtitle {
          font-size: 0.75rem; /* Adjusted font size */
          color: var(--color-subtitle);
          margin: 0;
          line-height: 1.2;
        }
        
        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem; /* Gap between items */
        }
        
        .credit-balance-display {
          display: flex;
          align-items: center;
          background-color: light-dark(#f0f0f0, #3a3a40);
          border-radius: 99px;
          padding: 0.2rem 0.2rem 0.2rem 0.6rem;
          gap: 0.4rem;
          border: 1px solid light-dark(#e0e0e0, #4a4a50);
        }
        .credit-icon {
          color: light-dark(#f9ab00, #fddc8c);
          font-size: 1.2rem;
        }
        .credit-amount {
          font-weight: bold;
          font-size: 0.9rem;
          color: var(--color-text);
        }
        .get-credits-button {
          background-color: var(--color-accent);
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          line-height: 1;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .get-credits-button:hover {
          transform: scale(1.1);
        }
        .get-credits-button .material-symbols-outlined {
          font-size: 1rem;
          font-weight: bold;
        }
        
        /* User Session Styles */
        .user-session-control {
          position: relative;
        }
        .login-button, .user-menu-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 0.8rem;
        }
        .login-button .material-symbols-outlined,
        .user-menu-button .material-symbols-outlined {
          font-size: 1.2rem;
        }
        .user-menu-button {
          background-color: transparent;
          border: none;
          border-radius: 4px;
          color: var(--color-text);
        }
        .user-menu-button:hover {
          background-color: light-dark(#f0f0f0, #3a3a40);
        }
        .user-menu-name {
          font-weight: 500;
          font-size: 0.85rem;
        }
        .user-dropdown-menu {
          position: absolute;
          top: calc(100% + 5px);
          right: 0;
          background-color: var(--color-background-header, light-dark(#fff, #2c2c30));
          border: 1px solid light-dark(#e0e0e0, #4a4a50);
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          width: 220px;
          z-index: 1001;
          overflow: hidden;
        }
        .user-dropdown-header {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid light-dark(#e0e0e0, #4a4a50);
          font-size: 0.8rem;
          color: var(--color-subtitle);
        }
        .user-dropdown-header strong {
          display: block;
          color: var(--color-text);
          font-size: 0.9rem;
          margin-top: 0.2rem;
          font-weight: 500;
        }
        .user-dropdown-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          padding: 0.75rem 1rem;
          font-size: 0.9rem;
          color: var(--color-text);
        }
        .user-dropdown-item:hover {
          background-color: var(--color-accent);
          color: #fff;
        }
        .user-dropdown-item .material-symbols-outlined {
          font-size: 1.2rem;
        }


        .llm-log-toggle {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.3rem 0.6rem;
          font-size: 0.8rem;
        }
        .llm-log-toggle .material-symbols-outlined {
          font-size: 1.2rem; /* Icon size */
        }
         .button-text-desktop {
            display: none; /* Hide text on smaller screens initially */
         }

        .desktop-nav {
          display: none;
        }
        .desktop-nav ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          align-items: center; /* Align button with text links */
          gap: 1rem; /* Spacing between menu items */
        }
        .desktop-nav a, .desktop-nav .nav-button {
          text-decoration: none;
          color: var(--color-text);
          font-weight: 500;
          font-size: 0.9rem;
          padding: 0.5rem;
          border-radius: 4px;
          transition: background-color 0.2s, color 0.2s;
          background: none;
          border: none;
          cursor: pointer;
          font-family: inherit;
        }
        .desktop-nav a:hover, .desktop-nav .nav-button:hover {
          background-color: var(--color-accent);
          color: light-dark(#fff, #fff);
        }

        .hamburger-button {
          display: flex; /* Changed to flex for mobile */
          flex-direction: column;
          justify-content: space-around;
          width: 30px;
          height: 30px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
          z-index: 1001; /* Above mobile nav initially if needed */
        }
        .hamburger-line {
          display: block;
          width: 100%;
          height: 3px;
          background-color: var(--color-text);
          border-radius: 3px;
          transition: all 0.3s ease-in-out;
        }
        .app-header.nav-open .hamburger-line:nth-child(1) {
          transform: translateY(8px) rotate(45deg);
        }
        .app-header.nav-open .hamburger-line:nth-child(2) {
          opacity: 0;
        }
        .app-header.nav-open .hamburger-line:nth-child(3) {
          transform: translateY(-8px) rotate(-45deg);
        }
        .mobile-nav {
          display: block;
          position: absolute;
          top: var(--header-height);
          left: 0;
          width: 100%;
          background-color: var(--color-background-header, light-dark(#fff, #2c2c30));
          border-bottom: 1px solid light-dark(#e0e0e0, #3a3a3f);
        }
        .mobile-nav ul {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .mobile-nav li {
          border-bottom: 1px solid light-dark(#e0e0e0, #4a4a50);
        }
        .mobile-nav a,
        .nav-button-mobile {
          display: block;
          padding: 0.75rem 1rem;
          text-decoration: none;
          color: var(--color-text);
        }
        .mobile-nav a:hover,
        .nav-button-mobile:hover {
          background-color: var(--color-accent);
          color: #fff;
        }
        .mobile-nav-llm-toggle {
          list-style: none;
          padding: 0.5rem 1rem;
          border-top: 1px solid light-dark(#e0e0e0, #4a4a50);
        }
        .llm-log-toggle-mobile {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: none;
          border: none;
          padding: 0.6rem 0;
          color: var(--color-text);
        }
        @media (min-width: 768px) {
          .desktop-nav { display: block; }
          .hamburger-button { display: none; }
          .button-text-desktop { display: inline; }
        }
      `}</style>
    </>
  );
};

export default Header;
