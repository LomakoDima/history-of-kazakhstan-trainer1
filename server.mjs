import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(root, "index.html");
const port = Number(process.env.PORT || 8787);
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-5-mini";

const schema = {
  type: "object",
  properties: {
    human_or_ai: {
      type: "object",
      properties: {
        score: { type: "integer", minimum: 0, maximum: 10, description: "10 means strongly human-authored; 0 means strongly AI-like." },
        label: { type: "string", enum: ["Likely human", "Uncertain", "Likely AI-assisted"] },
        explanation: { type: "string" }
      },
      required: ["score", "label", "explanation"],
      additionalProperties: false
    },
    fact_check: {
      type: "object",
      properties: {
        score: { type: "integer", minimum: 0, maximum: 10 },
        explanation: { type: "string" }
      },
      required: ["score", "explanation"],
      additionalProperties: false
    },
    relevance: {
      type: "object",
      properties: {
        score: { type: "integer", minimum: 0, maximum: 10 },
        explanation: { type: "string" }
      },
      required: ["score", "explanation"],
      additionalProperties: false
    },
    depth: {
      type: "object",
      properties: {
        score: { type: "integer", minimum: 0, maximum: 10 },
        explanation: { type: "string" }
      },
      required: ["score", "explanation"],
      additionalProperties: false
    },
    overall_feedback: { type: "string" },
    suggested_improvements: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 4
    }
  },
  required: ["human_or_ai", "fact_check", "relevance", "depth", "overall_feedback", "suggested_improvements"],
  additionalProperties: false
};

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  });
  res.end(JSON.stringify(data));
}

async function readJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 100_000) throw new Error("Request is too large.");
  }
  return JSON.parse(body || "{}");
}

async function evaluateEssay(payload) {
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  const essay = String(payload.essay || "").trim();
  const topic = String(payload.topic || "").trim();
  if (essay.split(/\s+/).length < 30) throw new Error("The essay must contain at least 30 words.");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: 1400,
      instructions:
        "You are a strict but constructive university History of Kazakhstan essay evaluator. " +
        "Evaluate the English essay only against the supplied topic. Score every criterion from 0 to 10. " +
        "For Human or AI, never claim certainty: authorship cannot be proven from prose alone. Use writing style plus the supplied typing-integrity signals and clearly express uncertainty. " +
        "For Fact Check, identify concrete historical inaccuracies and do not invent errors. " +
        "For Relevance, judge how directly the essay answers the selected topic. " +
        "For Depth, judge explanation, causal links, examples, dates, names, and analysis rather than length alone. " +
        "Keep each explanation concise, specific, and understandable to an A2-B1 English learner.",
      input:
        "UNIT: " + String(payload.unit || "") + "\n" +
        "ESSAY TOPIC: " + topic + "\n" +
        "TYPING INTEGRITY SIGNALS: " + JSON.stringify(payload.integrity || {}) + "\n\n" +
        "STUDENT ESSAY:\n" + essay,
      text: {
        format: {
          type: "json_schema",
          name: "history_essay_review",
          strict: true,
          schema
        }
      }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message || "OpenAI API error (" + response.status + ").";
    throw new Error(message);
  }
  const outputText = data.output_text ||
    data.output?.flatMap(item => item.content || []).find(item => item.type === "output_text")?.text;
  if (!outputText) throw new Error("OpenAI returned no review text.");
  return JSON.parse(outputText);
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.url === "/api/evaluate" && req.method === "POST") {
    try {
      const payload = await readJson(req);
      return sendJson(res, 200, await evaluateEssay(payload));
    } catch (error) {
      return sendJson(res, 500, { error: error.message || "Evaluation failed." });
    }
  }
  if (req.method === "GET" && (req.url === "/" || req.url.startsWith("/index"))) {
    try {
      const html = await fs.readFile(htmlPath);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      return res.end(html);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Trainer HTML file was not found next to server.mjs.");
    }
  }
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

server.listen(port, "127.0.0.1", () => {
  const url = "http://localhost:" + port;
  console.log("History trainer v4 is running at " + url);
  console.log("OpenAI model: " + model);
  if (process.platform === "win32") spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
});
