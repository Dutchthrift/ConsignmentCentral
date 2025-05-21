/**
 * OpenAI client for AI analysis of items
 */
import OpenAI from 'openai';

// Initialize the OpenAI client with API key from environment
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Check if OpenAI API key is configured
export function isAiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export default openai;