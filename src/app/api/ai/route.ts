import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.G4F_API_BASE || "https://g4f.space/v1";
const API_KEY = process.env.G4F_API_KEY || "";

async function chatCompletion(messages: { role: string; content: string }[]) {
  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "auto",
      messages,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, word, words, userLevel } = body;

    let messages: { role: string; content: string }[] = [];

    switch (action) {
      case "explain":
        messages = [
          {
            role: "system",
            content:
              "You are a GRE vocabulary tutor. Give concise, memorable explanations. Include: 1) Definition 2) Etymology if helpful 3) Example sentence 4) A mnemonic to remember it. Keep it under 150 words.",
          },
          {
            role: "user",
            content: `Explain the GRE word "${word}" in a memorable way.`,
          },
        ];
        break;

      case "synonyms":
        messages = [
          {
            role: "system",
            content:
              "You are a GRE vocabulary expert. Provide synonyms and antonyms relevant to GRE context. Format as JSON: {\"synonyms\": [...], \"antonyms\": [...], \"usage_note\": \"...\"}",
          },
          {
            role: "user",
            content: `Give GRE-relevant synonyms and antonyms for "${word}".`,
          },
        ];
        break;

      case "sentence":
        messages = [
          {
            role: "system",
            content:
              "You are a GRE writing tutor. Create 3 example sentences that show the word used in GRE-level academic contexts. Make sentences vivid and memorable.",
          },
          {
            role: "user",
            content: `Create 3 GRE-level example sentences using the word "${word}".`,
          },
        ];
        break;

      case "compare":
        messages = [
          {
            role: "system",
            content:
              "You are a GRE vocabulary expert. Compare commonly confused GRE words. Explain the subtle differences with examples. Be concise.",
          },
          {
            role: "user",
            content: `Compare these commonly confused GRE words and explain their differences: ${(words as string[]).join(", ")}`,
          },
        ];
        break;

      case "recommend":
        messages = [
          {
            role: "system",
            content:
              "You are a GRE prep advisor. Based on the user's current level and known/unknown words, recommend a study strategy. Be specific and actionable. Keep under 200 words.",
          },
          {
            role: "user",
            content: `My GRE vocab study stats: Level: ${userLevel || "beginner"}. Known words: ${(words as string[])?.slice(0, 20)?.join(", ") || "none yet"}. Recommend what I should focus on next.`,
          },
        ];
        break;

      case "mnemonic":
        messages = [
          {
            role: "system",
            content:
              "You are a creative memory coach. Create a funny, vivid, or unusual mnemonic device to remember this GRE vocabulary word. Make it stick!",
          },
          {
            role: "user",
            content: `Create a memorable mnemonic for the word "${word}" (meaning: ${body.definition || ""}).`,
          },
        ];
        break;

      case "mcq":
        messages = [
          {
            role: "system",
            content:
              `You are a GRE vocabulary quiz generator. Given a word and its correct definition, generate plausible but WRONG definition options for a multiple choice quiz, plus a vivid example sentence using the word.

RESPOND ONLY with valid JSON, no markdown, no code fences:
{"distractors": ["wrong def 1", "wrong def 2", "wrong def 3"], "example": "A sentence using the **word** in context."}

Rules for distractors:
- Each distractor should be 1-4 words (short, like Magoosh style)
- They should be plausible but clearly different from the correct meaning
- Do not repeat the correct definition
- Make them similar in length/style to the correct definition`,
          },
          {
            role: "user",
            content: `Word: "${word}"\nCorrect definition: "${body.definition}"\n\nGenerate 3 wrong short definitions and an example sentence.`,
          },
        ];
        break;

      case "chat":
        messages = [
          {
            role: "system",
            content:
              "You are VocabMaster AI, a helpful GRE vocabulary tutor. Help students learn and remember GRE words. Be encouraging, concise, and use examples. If asked about non-GRE topics, gently redirect to vocabulary study.",
          },
          ...(body.messages || []),
        ];
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    const reply = await chatCompletion(messages);
    return NextResponse.json({ result: reply });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("AI API error:", message);
    return NextResponse.json(
      { error: "AI request failed", details: message },
      { status: 500 }
    );
  }
}
