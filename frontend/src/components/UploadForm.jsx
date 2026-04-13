import React, { useState, useRef } from 'react';
import { Upload, FileType } from 'lucide-react';

export default function UploadForm({ onUpload }) {
  const [jd, setJd] = useState('');
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setupFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setupFile(e.target.files[0]);
    }
  };

  const setupFile = (f) => {
    if (f.type !== 'application/pdf') {
      alert("Please upload a PDF file.");
      return;
    }
    setFile(f);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!jd.trim() || !file) return;
    onUpload(jd, file);
  };

  return (
    <div className="glass-card">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Job Description</label>
          <textarea 
            className="form-textarea" 
            placeholder="Paste the target job description here..."
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Resume PDF</label>
          <div 
            className={`file-drop-zone ${isDragging ? 'active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
          >
            {file ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <FileType size={48} color="var(--accent-primary)" style={{ marginBottom: '1rem' }} />
                <p style={{ fontWeight: 600 }}>{file.name}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Click to replace</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Upload size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
                <p>Drag & drop your PDF resume here</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>or click to browse</p>
              </div>
            )}
            <input 
              type="file" 
              accept=".pdf" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              style={{ display: 'none' }}
            />
          </div>
        </div>

        <button 
          type="submit" 
          className="btn-primary"
          disabled={!jd.trim() || !file}
        >
          Analyze Resume with AI
        </button>
      </form>
    </div>
  );
}
