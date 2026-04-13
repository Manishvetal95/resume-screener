import React from 'react';
import { RotateCcw } from 'lucide-react';

export default function ResultDisplay({ result, onReset }) {
  const { score, verdict, justification, missing_requirements } = result;

  const getVerdictClass = (v) => {
    if (v.includes('Strong')) return 'strong';
    if (v.includes('Good')) return 'good';
    if (v.includes('Weak')) return 'weak';
    return 'none';
  };

  const vClass = getVerdictClass(verdict);

  return (
    <div className="glass-card" style={{ textAlign: 'center' }}>
      <div className={`score-circle ${vClass}`}>
        <span className="score-value">{score}</span>
        <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>/100</span>
      </div>

      <div className={`verdict-badge ${vClass}`}>
        {verdict}
      </div>

      <div className="details-section">
        <h3>AI Justification</h3>
        <p className="justification-text">{justification}</p>
      </div>

      {missing_requirements && missing_requirements.length > 0 && (
        <div className="details-section">
          <h3>Missing Key Requirements</h3>
          <ul className="missing-reqs-list">
            {missing_requirements.map((req, i) => (
              <li key={i}>{req}</li>
            ))}
          </ul>
        </div>
      )}

      <button 
        style={{ marginTop: '3rem', width: 'auto' }} 
        className="btn-primary" 
        onClick={onReset}
      >
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <RotateCcw size={18} />
          Evaluate Another Candidate
        </span>
      </button>
    </div>
  );
}
