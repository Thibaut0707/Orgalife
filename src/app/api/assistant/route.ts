// src/app/api/assistant/route.ts
import { NextRequest } from "next/server";
import OpenAI from "openai";
import { runSearch } from "@/lib/tools/webSearch";

export const runtime = "nodejs";

type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? body.messages : [];

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY manquant dans .env.local" }),
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const tools = [
      {
        type: "function" as const,
        function: {
          name: "web_search",
          description:
            "Effectue une recherche web et renvoie des résultats résumés avec liens.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Requête de recherche" },
              maxResults: {
                type: "number",
                description: "Nombre maximum de résultats (3–10)",
              },
              timeRange: {
                type: "string",
                description:
                  'Fenêtre temporelle (ex: "d7", "d30", "y1") si supporté',
              },
            },
            required: ["query"],
          },
        },
      },
    ];

    // 1) Premier appel
    const first = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.4,
      response_format: { type: "text" },
    });

    const choice = first.choices?.[0];
    if (!choice) {
      return Response.json({ error: "Aucun choix renvoyé par le modèle." }, { status: 500 });
    }

    const toolCalls = (choice.message?.tool_calls || []) as ToolCall[];
    let updatedMessages = [...messages, choice.message];

    // 2) Exécuter les outils demandés
    for (const call of toolCalls) {
      const name = call.function?.name;
      const args = safeJSON(call.function?.arguments);

      if (name === "web_search") {
        const result = await runSearch(args.query, {
          maxResults: clamp(args.maxResults ?? 5, 1, 10),
          timeRange: args.timeRange || undefined,
        });

        updatedMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        } as any);
      }
    }

    // 3) Si un outil a été appelé, on demande la réponse finale
    const finalResp =
      toolCalls.length > 0
        ? await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: updatedMessages,
            temperature: 0.4,
            response_format: { type: "text" },
          })
        : first;

    const finalMsg = finalResp.choices?.[0]?.message;

    if (!finalMsg) {
      return Response.json(
        { error: "Réponse finale vide du modèle." },
        { status: 500 }
      );
    }

    // Toujours renvoyer quelque chose d’affichable
    const safeContent =
      typeof finalMsg.content === "string" && finalMsg.content.trim().length > 0
        ? finalMsg.content
        : JSON.stringify(finalMsg, null, 2);

    return Response.json({ message: { ...finalMsg, content: safeContent } });
  } catch (e: any) {
    console.error("[/api/assistant] ERROR:", e);
    return new Response(
      JSON.stringify({ error: e?.message || "Erreur serveur dans /api/assistant" }),
      { status: 500 }
    );
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function safeJSON(s: any) {
  if (typeof s !== "string") return {};
  try { return JSON.parse(s); } catch { return {}; }
}
