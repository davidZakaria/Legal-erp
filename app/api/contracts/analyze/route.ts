import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/auditLogger";
import { canCreateContract } from "@/lib/rbac";

export const runtime = "nodejs";

const SYSTEM_PROMPT =
  "You are an expert Egyptian legal assistant for New Jersey Developments. Read this Arabic construction contract. Extract and return ONLY a JSON object with these exact keys: `contractorName` (string), `totalValue` (number), `guaranteeExpiryDate` (YYYY-MM-DD).";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function normalizeDateString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const ymd = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymd) {
    const [, year, month, day] = ymd;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

function parseAnalysisResult(raw: string) {
  const json = JSON.parse(raw) as Record<string, unknown>;
  const contractorName =
    typeof json.contractorName === "string" ? json.contractorName.trim() : "";
  const totalValue = Number(json.totalValue);
  const guaranteeExpiryDate = normalizeDateString(json.guaranteeExpiryDate);

  if (!contractorName || !Number.isFinite(totalValue) || totalValue <= 0) {
    throw new Error("Invalid analysis result");
  }

  return { contractorName, totalValue, guaranteeExpiryDate };
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canCreateContract(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key is not configured" },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let extractedText = "";

  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const textResult = await parser.getText();
      extractedText = textResult.text.trim();
    } finally {
      await parser.destroy();
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to extract text from PDF" },
      { status: 422 }
    );
  }

  if (!extractedText) {
    return NextResponse.json(
      { error: "No readable text found in PDF" },
      { status: 422 }
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let parsed: ReturnType<typeof parseAnalysisResult>;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: extractedText },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error("Empty model response");
    }

    parsed = parseAnalysisResult(raw);
  } catch {
    return NextResponse.json(
      { error: "Failed to analyze contract with AI" },
      { status: 502 }
    );
  }

  await logActivity(session.user.id, "ANALYZE_CONTRACT", "Contract", "intake");

  return NextResponse.json(parsed);
}
