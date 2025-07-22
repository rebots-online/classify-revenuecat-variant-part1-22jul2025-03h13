/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import React from 'react';

type CostLevel = 'Low' | 'Medium' | 'High';

interface CostIndicatorProps {
  level: CostLevel;
  prefix?: string;
}

const CostIndicator: React.FC<CostIndicatorProps> = ({ level, prefix }) => {
  const levelClass = `cost-indicator--${level.toLowerCase()}`;
  
  return (
    <div className="cost-indicator-container" title={`Estimated computational cost: ${level}`}>
      {prefix && <span className="cost-indicator-prefix">{prefix}</span>}
      <span className={`cost-indicator ${levelClass}`}>
        {level}
      </span>
      <style>{`
        .cost-indicator-container {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          color: var(--color-subtitle);
        }
        .cost-indicator-prefix {
          font-weight: 500;
        }
        .cost-indicator {
          display: inline-block;
          padding: 0.15rem 0.5rem;
          border-radius: 999px;
          font-weight: bold;
          font-size: 0.75rem;
          line-height: 1.2;
          border: 1px solid transparent;
        }
        .cost-indicator--low {
          background-color: light-dark(rgba(52, 168, 83, 0.1), rgba(52, 168, 83, 0.25));
          color: light-dark(#185c2c, #a8d5b6);
          border-color: light-dark(rgba(52, 168, 83, 0.3), rgba(52, 168, 83, 0.5));
        }
        .cost-indicator--medium {
          background-color: light-dark(rgba(249, 171, 0, 0.1), rgba(249, 171, 0, 0.25));
          color: light-dark(#7a5300, #fddc8c);
          border-color: light-dark(rgba(249, 171, 0, 0.4), rgba(249, 171, 0, 0.6));
        }
        .cost-indicator--high {
          background-color: light-dark(rgba(234, 67, 53, 0.1), rgba(234, 67, 53, 0.25));
          color: light-dark(#b3261e, #f6a69e);
          border-color: light-dark(rgba(234, 67, 53, 0.3), rgba(234, 67, 53, 0.5));
        }
      `}</style>
    </div>
  );
};

export default CostIndicator;
