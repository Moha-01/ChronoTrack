'use server';
/**
 * @fileOverview AI agent that suggests project options based on keywords.
 *
 * - suggestProjectFromKeywords - A function that suggests project options based on keywords.
 * - SuggestProjectInput - The input type for the suggestProjectFromKeywords function.
 * - SuggestProjectOutput - The return type for the suggestProjectFromKeywords function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestProjectInputSchema = z.object({
  keywords: z
    .string()
    .describe('Keywords related to the work performed.'),
});
export type SuggestProjectInput = z.infer<typeof SuggestProjectInputSchema>;

const SuggestProjectOutputSchema = z.object({
  suggestedProjects: z
    .array(z.string())
    .describe('An array of suggested project names.'),
});
export type SuggestProjectOutput = z.infer<typeof SuggestProjectOutputSchema>;

export async function suggestProjectFromKeywords(input: SuggestProjectInput): Promise<SuggestProjectOutput> {
  return suggestProjectFromKeywordsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestProjectPrompt',
  input: {schema: SuggestProjectInputSchema},
  output: {schema: SuggestProjectOutputSchema},
  prompt: `You are a project suggestion assistant. Based on the provided keywords, suggest relevant project names.

Keywords: {{{keywords}}}

Please provide a list of project names that are most relevant to the keywords.`,
});

const suggestProjectFromKeywordsFlow = ai.defineFlow(
  {
    name: 'suggestProjectFromKeywordsFlow',
    inputSchema: SuggestProjectInputSchema,
    outputSchema: SuggestProjectOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
