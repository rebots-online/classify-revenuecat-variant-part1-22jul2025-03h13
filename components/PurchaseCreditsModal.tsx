/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import React, { useState } from 'react';
import { requestProvider } from 'webln';
import { AppConfig } from '@/App';

interface PurchaseCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (amount: number) => void;
  config: AppConfig | null;
}

const creditPacks = [
  { credits: 500, price: '$4.99', popular: false },
  { credits: 1200, price: '$9.99', popular: true, description: 'Best Value' },
  { credits: 3000, price: '$19.99', popular: false },
];

const lightningPacks = [
  { credits: 500, sats: 2500 },
  { credits: 2500, sats: 10000 },
  { credits: 7000, sats: 25000 },
]

const PurchaseCreditsModal: React.FC<PurchaseCreditsModalProps> = ({ isOpen, onClose, onPurchase, config }) => {
  const [isPayingWithLn, setIsPayingWithLn] = useState(false);

  if (!isOpen) {
    return null;
  }
  
  const showLightningOption = config?.lnPubKey && config.lnPubKey.length > 0;

  const handleSimulatedPurchase = (credits: number) => {
    // This simulates a purchase via a traditional payment provider
    onPurchase(credits);
  };
  
  const handleLightningPurchase = async (sats: number, credits: number) => {
    if (!config?.lnPubKey) {
        alert("Lightning payments are not configured by the site operator.");
        return;
    }
    setIsPayingWithLn(true);
    try {
        const webln = await requestProvider();
        await webln.keysend({
            destination: config.lnPubKey,
            amount: sats,
            customRecords: {
                "34349334": `Purchase ${credits} credits for Classify App`
            }
        });
        // On success, add credits to the user's balance
        onPurchase(credits);
        alert(`Payment successful! ${credits.toLocaleString()} credits added.`);
        onClose(); // Close modal on success
    } catch (err) {
        console.error("WebLN Payment Error:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        alert(`Payment failed: ${errorMessage}`);
    } finally {
        setIsPayingWithLn(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="purchaseCreditsTitle">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '850px'}}>
        <button className="modal-close-button" onClick={onClose} aria-label="Close purchase dialog">
          <span className="material-symbols-outlined">close</span>
        </button>
        <h2 id="purchaseCreditsTitle" className="modal-title">Purchase Credits</h2>
        
        <div className="modal-section">
          <p style={{textAlign: 'center', fontSize: '1.1rem'}}>
            Credits are used across the platform to generate content. Choose a pack to continue creating!
          </p>
        </div>

        <div className="purchase-modal-packages">
          {creditPacks.map((pack, index) => (
            <div
              key={index}
              className={`credit-package ${pack.popular ? 'popular' : ''}`}
              onClick={() => handleSimulatedPurchase(pack.credits)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSimulatedPurchase(pack.credits)}
            >
              {pack.popular && <div className="popular-badge">{pack.description || 'Popular'}</div>}
              <div>
                <div className="credit-package-amount">
                  {pack.credits.toLocaleString()} <span>Credits</span>
                </div>
                <div className="credit-package-price">{pack.price}</div>
              </div>
              <button className="button-primary" disabled={isPayingWithLn}>
                Purchase Now
              </button>
            </div>
          ))}
        </div>

        {showLightningOption && (
            <div className="lightning-purchase-section">
                <h3>Or Pay with Lightning ⚡</h3>
                <div className="lightning-purchase-options">
                    {lightningPacks.map((pack) => (
                        <button 
                            key={pack.sats}
                            className="lightning-button"
                            onClick={() => handleLightningPurchase(pack.sats, pack.credits)}
                            disabled={isPayingWithLn}
                        >
                            <span className="ln-button-credits">{pack.credits.toLocaleString()} Credits</span>
                            <span className="ln-button-sats">for {pack.sats.toLocaleString()} sats</span>
                        </button>
                    ))}
                </div>
            </div>
        )}

        <div className="modal-actions" style={{justifyContent: 'center', marginTop: '1.5rem'}}>
          <button type="button" className="button-secondary" onClick={onClose} disabled={isPayingWithLn}>
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseCreditsModal;