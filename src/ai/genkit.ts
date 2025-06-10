'use server';

import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";
import { GenkitPlugin } from "genkit/plugin";

const plugins: GenkitPlugin[] = [];
const genkitIsConfiguredInternally = !!process.env.GOOGLE_API_KEY;

if (genkitIsConfiguredInternally) {
  plugins.push(googleAI());
} else {
  // Log a warning if the key is missing, visible in build logs or server logs
  if (typeof window === "undefined") {
    // Server-side check
    console.warn(
      "WARNING: GOOGLE_API_KEY is not set. AI features requiring Google AI will not be available. Please set this environment variable."
    );
  }
}

export const ai = genkit({
  plugins: plugins,
  // No default model here to avoid errors if googleAI plugin is not loaded.
  // Models should be specified in prompt/flow definitions or generate calls.
});

// Removed export of isGenkitConfigured. Server components should check process.env.GOOGLE_API_KEY directly.
// Client components should receive this as a prop if needed.
