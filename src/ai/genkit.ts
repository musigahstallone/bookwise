
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Ensure you have GEMINI_API_KEY in your .env file
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  console.warn(
    'GEMINI_API_KEY is not set in environment variables. AI features may not work.'
  );
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: geminiApiKey, // Explicitly use the new environment variable
    }),
  ],
  model: 'googleai/gemini-2.0-flash', // Model can be specified per-call if needed
});