import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.OLLAMA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Ollama API key not configured" }, { status: 500 });
  }

  const response = await fetch("https://ollama.com/api/tags", {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Unable to load Ollama models" }, { status: response.status });
  }

  const payload = await response.json();
  const models = Array.isArray(payload.models)
    ? payload.models
        .map((model: { name?: unknown }) => model.name)
        .filter((name: unknown): name is string => typeof name === "string" && name.length > 0)
    : [];

  return NextResponse.json({ models });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
