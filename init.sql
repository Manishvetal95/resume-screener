CREATE TABLE IF NOT EXISTS evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(50) NOT NULL, -- processing, completed, failed
  resume_filename VARCHAR(255) NOT NULL,
  jd_text TEXT NOT NULL,
  score INTEGER,
  verdict VARCHAR(50),
  missing_requirements JSONB,
  justification TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
