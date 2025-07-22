/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import React from 'react';

interface OnboardingWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateHosted: () => void;
}

const OnboardingWalletModal: React.FC<OnboardingWalletModalProps> = ({ isOpen, onClose, onCreateHosted }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="onboardingWalletTitle">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '700px'}}>
        <button className="modal-close-button" onClick={onClose} aria-label="Close wallet onboarding dialog">
          <span className="material-symbols-outlined">close</span>
        </button>
        <h2 id="onboardingWalletTitle" className="modal-title">Lightning Wallet Required</h2>

        <div className="modal-section">
          <p>To purchase credits with Lightning, you need a WebLN compatible wallet (like <a href="https://getalby.com" target="_blank" rel="noopener noreferrer">Alby</a>).</p>
          <p>If you do not have one available, you can create a temporary hosted wallet just for this session.</p>
        </div>

        <div className="modal-actions" style={{justifyContent: 'center'}}>
          <button type="button" className="button-secondary" onClick={onCreateHosted} style={{marginRight: '0.5rem'}}>
            Create Hosted Wallet
          </button>
          <button type="button" className="button-primary" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWalletModal;
