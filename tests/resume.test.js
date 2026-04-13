const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');
const Queue = require('bull');
const fs = require('fs');
const path = require('path');

// Mock Bull Queue
jest.mock('bull');

const mockAdd = jest.fn();
Queue.prototype.add = mockAdd;

const FIXTURE_PATH = path.join(__dirname, 'fixtures');
const SAMPLE_PDF_PATH = path.join(FIXTURE_PATH, 'sample.pdf');

// Setup mock db queries and lifecycle
beforeAll(() => {
  if (!fs.existsSync(FIXTURE_PATH)) {
    fs.mkdirSync(FIXTURE_PATH, { recursive: true });
  }
  
  if (!fs.existsSync(SAMPLE_PDF_PATH)) {
    // Write a dummy file that passes multer's filter
    fs.writeFileSync(SAMPLE_PDF_PATH, "Dummy PDF Content");
  }
});

afterAll(async () => {
  await db.pool.end();
  // Cleanup
  if (fs.existsSync(SAMPLE_PDF_PATH)) {
    fs.unlinkSync(SAMPLE_PDF_PATH);
  }
});

describe('Resume API Endpoints', () => {
  let createdEvaluationId;

  // We mock db.query to avoid needing a real PG database during straightforward testing
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/resume/upload', () => {
    it('should return 400 if no job description is provided', async () => {
      const response = await request(app)
        .post('/api/resume/upload')
        .attach('resume', SAMPLE_PDF_PATH);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Job description (jd) is required');
    });

    it('should return 400 if no resume file is provided', async () => {
      const response = await request(app)
        .post('/api/resume/upload')
        .field('jd', 'Looking for Node developer');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Resume PDF file is required');
    });

    it('should upload a resume, create an evaluation, and add to queue', async () => {
      // Mock db insertion
      db.query = jest.fn().mockResolvedValue({ rowCount: 1 });

      const response = await request(app)
        .post('/api/resume/upload')
        .field('jd', 'Looking for Node developer')
        .attach('resume', SAMPLE_PDF_PATH);

      expect(response.status).toBe(202);
      expect(response.body.status).toBe('processing');
      expect(response.body.evaluation_id).toBeDefined();

      createdEvaluationId = response.body.evaluation_id;

      // Verify db was called
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO evaluations'),
        expect.arrayContaining([createdEvaluationId, 'processing', expect.any(String), 'Looking for Node developer'])
      );

      // Verify queue was called
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          evaluationId: createdEvaluationId,
          jd: 'Looking for Node developer'
        }),
        expect.any(Object)
      );
    });
  });

  describe('GET /api/resume/result/:id', () => {
    it('should return 404 for unknown or invalid ID', async () => {
      // mock nothing returned
      db.query = jest.fn().mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/resume/result/b1cd1e11-1da1-11eb-1b11-1b111c111d11');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Evaluation not found');
    });

    it('should return the evaluation result if completed', async () => {
      const fakeResult = {
        evaluation_id: createdEvaluationId || 'test-uuid',
        status: 'completed',
        score: 85,
        verdict: 'Strong Match',
        missing_requirements: ['GraphQL'],
        justification: 'Great candidate'
      };

      db.query = jest.fn().mockResolvedValue({ rows: [fakeResult] });

      const response = await request(app)
        .get(`/api/resume/result/${fakeResult.evaluation_id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(fakeResult);
    });
  });
});
