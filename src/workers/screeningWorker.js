const Queue = require('bull');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const db = require('../db');
const geminiService = require('../services/geminiService');

const screeningQueue = new Queue('resume-screening', process.env.REDIS_URL || 'redis://localhost:6379');

// Worker configuration
screeningQueue.process(async (job) => {
  const { evaluationId, filepath, jd } = job.data;

  try {
    // 1. Read PDF
    const dataBuffer = fs.readFileSync(filepath);
    const pdfData = await pdfParse(dataBuffer);
    const resumeText = pdfData.text;

    // 2. Call Gemini
    let resultObj;
    try {
      resultObj = await geminiService.evaluateResume(jd, resumeText, false);
    } catch (llmErr) {
      if (llmErr.status === 429 || llmErr.status === 503) { // Handle rate limit & high demand
        console.warn(`API overloaded (status ${llmErr.status}) for eval ${evaluationId}. Retrying in 60s...`);
        // Throwing error causes Bull to retry based on backoff config, but the assignment asks for waiting 60 seconds specifically
        // To precisely wait 60s and retry:
        await new Promise(res => setTimeout(res, 60000));
        throw new Error('Rate Limited - Triggering Retry');
      }

      if (llmErr.message === 'Malformed JSON') {
         // Retry with stricter instructions once
         console.warn(`Malformed JSON for eval ${evaluationId}. Retrying once with stricter instructions...`);
         resultObj = await geminiService.evaluateResume(jd, resumeText, true);
      } else {
        throw llmErr;
      }
    }

    // 3. Update DB
    await db.query(`
      UPDATE evaluations 
      SET status = $1, score = $2, verdict = $3, missing_requirements = $4, justification = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
    `, [
      'completed',
      resultObj.score,
      resultObj.verdict,
      JSON.stringify(resultObj.missing_requirements || []),
      resultObj.justification,
      evaluationId
    ]);

  } catch (error) {
    console.error(`Job failed for evaluation ${evaluationId}:`, error);

    // If it's exhausting retries, the final update to failed is handled in the event listener below
    // Or we can manually enforce it if this is the last attempt:
    if (job.attemptsMade >= 2) { // the max attempts is 3, 0-indexed made
      await setStatusFailed(evaluationId);
    }

    throw error; // keep it failing to trigger backoffs
  }
});

async function setStatusFailed(evaluationId) {
  try {
    await db.query("UPDATE evaluations SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [evaluationId]);
  } catch (err) {
    console.error("Could not update status to failed:", err);
  }
}

// Global job listeners
screeningQueue.on('failed', async (job, err) => {
  console.log(`Job ${job.id} failed with error ${err.message}`);
  if (job.attemptsMade >= job.opts.attempts) {
    await setStatusFailed(job.data.evaluationId);
  }
});

console.log('Screening worker started and listening to queue...');

module.exports = screeningQueue;
