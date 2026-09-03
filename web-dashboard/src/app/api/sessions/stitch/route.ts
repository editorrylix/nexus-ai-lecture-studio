import { NextResponse } from 'next/server';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { readLocalSessions, saveOrUpdateSession, SessionData } from '@/lib/storage';

const StitchedSynthesisSchema = z.object({
  master_summary: z.string().describe("A comprehensive executive summary uniting all stitched lecture sections."),
  action_items: z.array(z.string()).describe("Consolidated key takeaways and action items across all sections."),
  course_outline: z.array(z.object({
    title: z.string(),
    bullet_points: z.array(z.string())
  })).describe("A unified multi-part course outline covering all combined sessions."),
  glossary: z.array(z.object({
    term: z.string(),
    definition: z.string()
  })).describe("Consolidated glossary of all unique technical and key concepts mentioned."),
  flashcards: z.array(z.object({
    front: z.string(),
    back: z.string()
  })).describe("A comprehensive set of 8-15 study flashcards covering the most critical testable material.")
});

export async function POST(req: Request) {
  try {
    const { sessionIds, customTitle } = await req.json();

    if (!Array.isArray(sessionIds) || sessionIds.length < 2) {
      return NextResponse.json({ 
        error: "Please select at least 2 sessions to stitch together." 
      }, { status: 400 });
    }

    const allSessions = readLocalSessions();
    const targets = allSessions.filter(s => sessionIds.includes(s.id));

    if (targets.length < 2) {
      return NextResponse.json({ error: "Could not find all specified sessions on disk." }, { status: 404 });
    }

    // Sort chronologically
    targets.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Combine transcripts
    let combinedTranscript = "";
    targets.forEach((s, idx) => {
      combinedTranscript += `\n\n=== PART ${idx + 1}: ${s.title || 'Session'} (${new Date(s.created_at).toLocaleDateString()}) ===\n`;
      combinedTranscript += s.raw_transcript || "";
    });

    const prompt = `You are a master academic researcher and edtech synthesizer.
The student has provided multiple lecture sessions that need to be stitched and synthesized into a single cohesive MASTER STUDY GUIDE.

Synthesize all the parts into:
1. A coherent Master Executive Summary that bridges concepts across parts.
2. A comprehensive list of action items and takeaways.
3. A structured unified Course Outline covering the entire progression.
4. A merged Glossary of key terms.
5. A high-yield Flashcard Deck (8-15 cards) for exam preparation.

Here are the combined lecture transcripts:
${combinedTranscript}
`;

    const { object } = await generateObject({
      model: google('gemini-3.6-flash'),
      schema: StitchedSynthesisSchema,
      prompt,
    });

    const masterId = `master_${Date.now()}`;
    const defaultTitle = customTitle?.trim() || `Master Guide: ${targets.map(t => t.title || 'Lecture').slice(0, 2).join(' + ')}${targets.length > 2 ? ` (+${targets.length - 2} more)` : ''}`;

    const newMasterSession: SessionData = {
      id: masterId,
      title: defaultTitle,
      created_at: new Date().toISOString(),
      summary: object.master_summary,
      action_items: object.action_items,
      raw_transcript: combinedTranscript.trim(),
      flashcards_json: {
        flashcards: object.flashcards,
        course_outline: object.course_outline,
        glossary: object.glossary,
        action_items: object.action_items
      },
      tags: ["Stitched Master Guide", `${targets.length} Parts`],
      pinned: true
    };

    saveOrUpdateSession(newMasterSession);

    return NextResponse.json({
      success: true,
      session: newMasterSession
    });

  } catch (error: any) {
    console.error("Stitching error:", error);
    return NextResponse.json({ 
      error: `Failed to stitch sessions: ${error.message || 'Unknown error'}` 
    }, { status: 500 });
  }
}
