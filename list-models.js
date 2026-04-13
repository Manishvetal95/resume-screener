// Using native fetch in Node 18+

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("No GEMINI_API_KEY found in environment.");
    return;
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.models) {
    console.log("Available Models:");
    data.models.forEach(m => console.log(m.name));
  } else {
    console.log("Error querying models:", data);
  }
}

listModels();
