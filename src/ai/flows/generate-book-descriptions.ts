
'use server';
/**
 * @fileOverview AI flow to generate book descriptions.
 *
 * - generateBookDescriptions - Generates short and long descriptions for a book.
 * - GenerateBookDescriptionsInput - Input type for the flow.
 * - GenerateBookDescriptionsOutput - Output type for the flow.
 */

import {ai, isGenkitConfigured} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBookDescriptionsInputSchema = z.object({
  title: z.string().describe('The title of the book.'),
  author: z.string().describe('The author of the book.'),
  category: z.string().optional().describe('The category or genre of the book (optional).'),
});
export type GenerateBookDescriptionsInput = z.infer<typeof GenerateBookDescriptionsInputSchema>;

const GenerateBookDescriptionsOutputSchema = z.object({
  shortDescription: z.string().describe('A compelling short description (2-3 sentences).'),
  longDescription: z.string().describe('A more detailed long description (2-3 paragraphs).'),
});
export type GenerateBookDescriptionsOutput = z.infer<typeof GenerateBookDescriptionsOutputSchema>;

export async function generateBookDescriptions(input: GenerateBookDescriptionsInput): Promise<GenerateBookDescriptionsOutput> {
  if (!isGenkitConfigured) {
    console.warn("AI Description Generator (Genkit/Google AI) is not configured due to missing API key. Returning placeholder descriptions.");
    return { 
        shortDescription: "Description generation AI is not available. Please configure the API key.",
        longDescription: "Detailed description cannot be generated as the AI service is not available. Ensure Google AI API Key is set." 
    };
  }
  return generateBookDescriptionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateBookDescriptionsPrompt',
  input: {schema: GenerateBookDescriptionsInputSchema},
  output: {schema: GenerateBookDescriptionsOutputSchema},
  model: 'googleai/gemini-2.0-flash',
  prompt: `You are an expert book copywriter.
Given the book title: "{{{title}}}"
By author: "{{{author}}}"
{{#if category}}
In the category/genre: "{{{category}}}"
{{/if}}

Based on this information, please generate:
1. A compelling short description (approximately 2-3 sentences) suitable for a quick overview on an online bookstore. This should be engaging and make someone want to learn more.
2. A more detailed long description (approximately 2-3 paragraphs, but can be longer if needed for a comprehensive summary). This should elaborate on the premise, themes, or what readers can expect, without giving away major spoilers.

Focus on intrigue and what would make someone want to read this book.
Return the descriptions in the specified JSON format.
If the category is very generic like 'Fiction' or 'Non-Fiction', try to infer more specific appeal based on title and author if possible, or focus on general appeal.
`,
});

const generateBookDescriptionsFlow = ai.defineFlow(
  {
    name: 'generateBookDescriptionsFlow',
    inputSchema: GenerateBookDescriptionsInputSchema,
    outputSchema: GenerateBookDescriptionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("AI failed to generate descriptions.");
    }
    return output;
  }
);
