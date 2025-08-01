/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import React, { useState } from 'react';
import JSZip from 'jszip';

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  appCode: string;
}

const DeployModal: React.FC<DeployModalProps> = ({ isOpen, onClose, appCode }) => {
  const [downloadMessage, setDownloadMessage] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleDownloadHtml = () => {
    try {
      const blob = new Blob([appCode], { type: 'text/html' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'index.html';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      setDownloadMessage('Download started: index.html');
      setTimeout(() => setDownloadMessage(''), 3000);
    } catch (error) {
      console.error('Failed to download HTML:', error);
      setDownloadMessage('Error: Could not prepare download.');
       setTimeout(() => setDownloadMessage(''), 3000);
    }
  };
  
  const handleDownloadZip = () => {
    try {
      const zip = new JSZip();
      zip.file("index.html", appCode);
      // You could add other assets here, e.g., zip.file("README.md", "...")
      zip.generateAsync({type:"blob"}).then(function(content) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'classify-app-project.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        setDownloadMessage('Download started: project.zip');
        setTimeout(() => setDownloadMessage(''), 3000);
      });
    } catch (error) {
      console.error('Failed to download ZIP:', error);
      setDownloadMessage('Error: Could not prepare zip file.');
      setTimeout(() => setDownloadMessage(''), 3000);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="deployAppTitle">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '700px'}}>
        <button className="modal-close-button" onClick={onClose} aria-label="Close deploy app dialog">
          <span className="material-symbols-outlined">close</span>
        </button>
        <h2 id="deployAppTitle" className="modal-title">Deploy & Share Your App</h2>
        
        <div className="modal-section">
          <p>Follow these steps to deploy your generated learning app to a live, shareable URL for free.</p>
        </div>

        <div className="modal-section">
          <h4>Step 1: Download Your Project</h4>
          <p>
            Choose a download format. The <strong>.zip file</strong> is recommended as it's ready for any web host.
          </p>
          <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
            <button onClick={handleDownloadZip} className="button-primary" style={{display: 'inline-flex', alignItems: 'center', gap: '0.5rem'}}>
              <span className="material-symbols-outlined">archive</span>
              Download Project (.zip)
            </button>
            <button onClick={handleDownloadHtml} className="button-secondary" style={{display: 'inline-flex', alignItems: 'center', gap: '0.5rem'}}>
              <span className="material-symbols-outlined">download</span>
              Download index.html Only
            </button>
          </div>
          {downloadMessage && <p style={{fontSize: '0.9rem', marginTop: '0.5rem', color: downloadMessage.startsWith('Error') ? 'var(--color-error)' : 'var(--color-positive)'}}>{downloadMessage}</p>}
        </div>

        <div className="modal-section">
          <h4>Step 2: Deploy to a Free Host</h4>
          <p>
            We recommend using a service that allows easy drag-and-drop deployment.
            <strong>Netlify Drop</strong> is excellent for this:
          </p>
          <ol style={{paddingLeft: '1.5rem', marginBottom: '1rem'}}>
            <li>
              Go to <a href="https://app.netlify.com/drop" target="_blank" rel="noopener noreferrer" style={{color: 'var(--color-accent)', fontWeight: 'bold'}}>Netlify Drop</a> (opens in a new tab).
            </li>
            <li>Drag and drop the <code>index.html</code> file or the <code>classify-app-project.zip</code> file you just downloaded onto their site.</li>
            <li>Netlify will instantly deploy your app and provide you with a live, shareable URL!</li>
          </ol>
          <p style={{fontSize: '0.9rem'}}>
            <em>Alternative:</em> <a href="https://vercel.com/new" target="_blank" rel="noopener noreferrer" style={{color: 'var(--color-accent)'}}>Vercel</a> also offers easy drag-and-drop deployment.
          </p>
        </div>

        <div className="modal-actions" style={{marginTop: '1.5rem'}}>
          <button type="button" className="button-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <style>{`
        /* Specific styles for DeployModal, leveraging common modal styles from index.css */
        .modal-section h4 {
          font-size: 1.1rem;
          color: var(--color-accent);
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .modal-section p, .modal-section li {
          font-size: 0.95rem;
          margin-bottom: 0.5rem;
        }
        .modal-section ol, .modal-section ul {
            margin-bottom: 1rem;
        }
        .modal-section code {
            background-color: var(--modal-code-bg);
            padding: 0.1em 0.4em;
            border-radius: 3px;
            font-family: var(--font-technical);
        }
      `}</style>
    </div>
  );
};

export default DeployModal;