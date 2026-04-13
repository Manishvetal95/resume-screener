import React, { useState, useEffect } from 'react';

export default function LoadingState() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-card pulse-container">
      <div className="pulse-ring"></div>
      <h2 style={{ marginBottom: '1rem' }}>AI is Analyzing Candidate</h2>
      <p style={{ color: 'var(--text-secondary)' }}>
        Extracting skills, comparing to JD, and crunching numbers{dots}
      </p>
    </div>
  );
}
