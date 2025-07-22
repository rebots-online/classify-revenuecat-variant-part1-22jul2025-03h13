/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  return (
    <>
      <footer className="app-footer">
        <p className="copyright-footer">
          &copy; {currentYear} Robin L. M. Cheung, MBA. All Rights Reserved.
        </p>
      </footer>
      <style>{`
        .app-footer {
          background-color: var(--color-background-footer, light-dark(#f0f0f0, #1e1e20));
          border-top: 1px solid light-dark(#e0e0e0, #3a3a3f);
          padding: 1rem;
          text-align: center;
          color: var(--color-text);
        }
        .copyright-footer {
          font-size: 0.8rem;
          color: var(--color-subtitle);
           margin: 0;
        }

         @media (max-width: 768px) {
            .copyright-footer {
                font-size: 0.7rem;
            }
        }
      `}</style>
    </>
  );
};

export default Footer;