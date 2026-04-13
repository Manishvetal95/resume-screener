# AI-Powered Resume Screener

A production-ready Node.js backend service that automates resume screening using Google's Gemini LLM. It parses PDF resumes, compares them against Job Descriptions using Few-Shot prompting, and returns structured evaluations asynchronously via Bull queue.

## Features
- **Async Processing:** Fast `POST` endpoint that accepts the file and delegates long-running LLM processing to a background worker.
- **LLM Integration:** Powered by Google Gemini (`gemini-1.5-flash`) for comprehensive NLP analysis.
- **Resilient Queue:** Redis + Bull queue with automatic retries and exponential backoff.
- **Robust Storage:** PostgreSQL database for evaluations tracking.
- **Production-Ready:** Dockerized with `docker-compose` combining API, Database, and Queue.

## Architecture Diagram

```ascii
      +-----------------+
      |                 |
      |   API Client    | (e.g. Frontend UI or cURL)
      |                 |
      +--------+--------+
               |
         HTTP POST /upload (PDF, JD)
               v
      +-----------------+
      |                 |     (Returns HTTP 202 Accepted, evaluation_id)
      |   Express API   |------------------------------+
      |  (Node.js App)  |                              |
      +--------+--------+                              |
               |                                       |
    Pushes Job |     +-----------------------+         | Database Insert
               v     |                       |         v
      +-----------------+                 +-----------------------+
      |                 |   Polls/Reads   |                       |
      |   Redis Queue   |<----------------| PostgreSQL Database   |
      |     (Bull)      |      Jobs       |     (evaluations)     |
      +-----------------+                 +-----------------------+
               |                                       ^
               v                                       | Updates status & result
      +-----------------+                              |
      |                 |------------------------------+
      |   Worker Node   |
      | (pdf-parse, fs) |
      +--------+--------+
               |
           API Calls
               v
      +-----------------+
      |                 |
      |  Gemini API     | (Screens resume against JD using prompts)
      |                 |
      +-----------------+
```

## Setup & Running

**1. Clone the repository**

**2. Setup environment variables**
```bash
cp .env.example .env
# Important: Edit .env and add your valid GEMINI_API_KEY
```

**3. Start the stack**
```bash
docker-compose up --build
```
This single command spins up:
- **api**: The Node.js application (port 3000)
- **postgres**: The Database (port 5432) initialized automatically with `init.sql`
- **redis**: The Queue broker (port 6379)

## API Documentation

### 1. Upload Resume
**POST** `/api/resume/upload`
Submit a resume (PDF) and Job Description for processing.

**Form-Data Fields:**
- `resume` (file, .pdf)
- `jd` (text)

**Example cURL:**
```bash
curl -X POST http://localhost:3000/api/resume/upload \
  -F "resume=@/path/to/my_resume.pdf" \
  -F "jd=Looking for a senior frontend developer with React and Vue experience."
```

**Response (202 Accepted):**
```json
{
  "evaluation_id": "c13d7a8e-28d8-4f81-9b16-5bc77b90f42b",
  "status": "processing",
  "message": "Resume received. Processing started."
}
```

### 2. Retrieve Result
**GET** `/api/resume/result/:evaluation_id`
Check the status and fetch the final AI evaluation.

**Example cURL:**
```bash
curl http://localhost:3000/api/resume/result/c13d7a8e-28d8-4f81-9b16-5bc77b90f42b
```

**Response (200 OK):**
```json
{
  "evaluation_id": "c13d7a8e-28d8-4f81-9b16-5bc77b90f42b",
  "status": "completed",
  "score": 85,
  "verdict": "Strong Match",
  "missing_requirements": ["GraphQL"],
  "justification": "Candidate has extensive experience in React and frontend architecture. They meet all core requirements except GraphQL."
}
```

## Environment Variables

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Your Google API Key for generative AI access |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis instance connection string |
| `PORT` | API Server port (default 3000) |

## Testing

Ensure PostgreSQL and Redis are available for tests, or mock them. Tests use Jest and Supertest.

```bash
npm run test
```
