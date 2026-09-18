export const maxDuration = 30;

const schema = {
  type: "object",
  properties: {
    human_or_ai: {
      type: "object",
      properties: {
        score: { type: "integer", minimum: 0, maximum: 10 },
        label: { type: "string", enum: ["Likely human", "Uncertain", "Likely AI-assisted"] },
        explanation: { type: "string" }
      },
      required: ["score", "label", "explanation"],
      additionalProperties: false
    },
    fact_check: {
      type: "object",
      properties: { score: { type: "integer", minimum: 0, maximum: 10 }, explanation: { type: "string" } },
      required: ["score", "explanation"],
      additionalProperties: false
    },
    relevance: {
      type: "object",
      properties: { score: { type: "integer", minimum: 0, maximum: 10 }, explanation: { type: "string" } },
      required: ["score", "explanation"],
      additionalProperties: false
    },
    depth: {
      type: "object",
      properties: { score: { type: "integer", minimum: 0, maximum: 10 }, explanation: { type: "string" } },
      required: ["score", "explanation"],
      additionalProperties: false
    },
    overall_feedback: { type: "string" },
    suggested_improvements: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 }
  },
  required: ["human_or_ai", "fact_check", "relevance", "depth", "overall_feedback", "suggested_improvements"],
  additionalProperties: false
};

function reply(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { Allow: "POST, OPTIONS" } });
}

export async function POST(request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return reply({ error: "OPENAI_API_KEY is not configured in Vercel project settings." }, 500);

    const payload = await request.json();
    const essay = String(payload.essay || "").trim();
    const topic = String(payload.topic || "").trim();
    if (essay.split(/\s+/).filter(Boolean).length < 30) return reply({ error: "The essay must contain at least 30 words." }, 400);

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5-mini",
        store: false,
        max_output_tokens: 1400,
        instructions: "You are a strict but constructive university History of Kazakhstan essay evaluator. Evaluate the English essay only against the supplied topic. Score every criterion from 0 to 10. For Human or AI, never claim certainty: authorship cannot be proven from prose alone. Use writing style plus the supplied typing-integrity signals and clearly express uncertainty. For Fact Check, identify concrete historical inaccuracies and do not invent errors. For Relevance, judge how directly the essay answers the selected topic. For Depth, judge explanation, causal links, examples, dates, names, and analysis rather than length alone. Keep each explanation concise, specific, and understandable to an A2-B1 English learner.",
        input: "UNIT: " + String(payload.unit || "") + "\nESSAY TOPIC: " + topic + "\nTYPING INTEGRITY SIGNALS: " + JSON.stringify(payload.integrity || {}) + "\n\nSTUDENT ESSAY:\n" + essay,
        text: { format: { type: "json_schema", name: "history_essay_review", strict: true, schema } }
      })
    });

    const data = await openaiResponse.json();
    if (!openaiResponse.ok) return reply({ error: data?.error?.message || "OpenAI API error." }, openaiResponse.status);
    const output = data.output_text || data.output?.flatMap(item => item.content || []).find(item => item.type === "output_text")?.text;
    if (!output) return reply({ error: "OpenAI returned no review text." }, 502);
    return reply(JSON.parse(output));
  } catch (error) {
    return reply({ error: error.message || "Evaluation failed." }, 500);
  }
}
