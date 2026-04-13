const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const db = require('../db');
const Queue = require('bull');

const router = express.Router();

// Define Bull queue
const screeningQueue = new Queue('resume-screening', process.env.REDIS_URL || 'redis://localhost:6379');

// Configure Multer for PDF uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  }
});

// POST /api/resume/upload
router.post('/upload', upload.single('resume'), async (req, res, next) => {
  try {
    const file = req.file;
    const jd = req.body.jd;

    if (!file) {
      return res.status(400).json({ error: 'Resume PDF file is required' });
    }
    if (!jd) {
      return res.status(400).json({ error: 'Job description (jd) is required' });
    }

    const evaluationId = uuidv4();

    // Insert initial record in db
    await db.query(
      'INSERT INTO evaluations (id, status, resume_filename, jd_text) VALUES ($1, $2, $3, $4)',
      [evaluationId, 'processing', file.filename, jd]
    );

    // Enqueue background job
    await screeningQueue.add({
      evaluationId,
      filename: file.filename,
      filepath: file.path,
      jd
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000 // 5 seconds initial delay
      }
    });

    res.status(202).json({
      evaluation_id: evaluationId,
      status: 'processing',
      message: 'Resume received. Processing started.'
    });

  } catch (err) {
    next(err);
  }
});

// GET /api/resume/result/:evaluation_id
router.get('/result/:evaluation_id', async (req, res, next) => {
  try {
    const { evaluation_id } = req.params;

    const result = await db.query(
      'SELECT id as evaluation_id, status, score, verdict, missing_requirements, justification FROM evaluations WHERE id = $1',
      [evaluation_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    res.status(200).json(result.rows[0]);

  } catch (err) {
    if (err.code === '22P02') { // invalid input syntax for type uuid
      return res.status(404).json({ error: 'Evaluation not found' });
    }
    next(err);
  }
});

module.exports = router;
