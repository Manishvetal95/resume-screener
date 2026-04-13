const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const promptTemplatePath = path.join(__dirname, '../../prompts/screening.md');

/**
 * Replace placeholders in the prompt and call Gemini API
 */
async function evaluateResume(jdText, resumeText, isRetry = false) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined");
  }

  let prompt = fs.readFileSync(promptTemplatePath, 'utf8');

  // If retrying, append stricter instruction
  if (isRetry) {
    prompt += "\n\nCRITICAL: You failed to provide valid JSON previously. Return exclusively a valid JSON object starting with { and ending with }, with no other text.";
  }

  prompt = prompt.replace('{{JD}}', jdText);
  prompt = prompt.replace('{{RESUME_TEXT}}', resumeText);

  // Use the specified model
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  
  return parseGeminiResponse(responseText);
}

function parseGeminiResponse(text) {
  let cleanedText = text.trim();
  // Strip out markdown code blocks if the LLM hallucinated them
  if (cleanedText.startsWith('```json')) {
    cleanedText = cleanedText.substring(7);
  }
  if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.substring(3);
  }
  if (cleanedText.endsWith('```')) {
    cleanedText = cleanedText.substring(0, cleanedText.length - 3);
  }
  cleanedText = cleanedText.trim();

  try {
    const parsed = JSON.parse(cleanedText);
    if (parsed.score === undefined || !parsed.verdict) {
      throw new Error("Missing required fields in JSON");
    }
    return parsed;
  } catch (err) {
    console.error("Failed to parse Gemini output:", text);
    throw new Error('Malformed JSON');
  }
}

module.exports = {
  evaluateResume
};
