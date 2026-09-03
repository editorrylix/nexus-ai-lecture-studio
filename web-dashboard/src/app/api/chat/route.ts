import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export async function POST(req: Request) {
  try {
    const { messages, transcript } = await req.json();

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: "Missing API Key: Please configure GOOGLE_GENERATIVE_AI_API_KEY in web-dashboard/.env.local." 
      }), { status: 400 });
    }

    const systemPrompt = `You are an elite, helpful study assistant for university lectures and meetings.
Your answers MUST be grounded in THIS LECTURE TRANSCRIPT:
${transcript || "No transcript provided."}

Formatting guidelines:
- Be clear, direct, and structured.
- Use markdown bullet points and bolding for key terms.
- If a question cannot be answered from the transcript, politely clarify that it was not mentioned in this lecture session.`;

    const result = streamText({
      model: google('gemini-3.6-flash'),
      system: systemPrompt,
      messages,
    });

    return result.toTextStreamResponse();
  } catch (e: any) {
    console.error("Chat API error:", e);
    const friendlyMsg = e.message?.includes("quota")
      ? "Gemini API rate limit reached on free tier. Please wait 15 seconds before trying again."
      : (e.message || "An unexpected error occurred in the study assistant.");
    return new Response(JSON.stringify({ error: friendlyMsg }), { status: 500 });
  }
}
