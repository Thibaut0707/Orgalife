// src/app/assistant/page.tsx
"use client";

import { useState, useRef } from "react";

type Msg = { role: "user" | "assistant" | "system" | "tool"; content: string };

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "system",
      content:
        "Tu es OrgaLife Assistant. Tu peux faire des recherches web via l’outil 'web_search' quand c’est pertinent. Réponds en français.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text) return;
    if (!preset) setInput("");

    const newMsgs = [...messages, { role: "user", content: text }];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const resp = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMsgs }),
      });
      const data = await resp.json();

      if (!resp.ok) {
        const err = data?.error || "Erreur inconnue.";
        setMessages((m) => [...m, { role: "assistant", content: `❌ ${err}` }]);
      } else {
        const content =
          data?.message?.content ||
          data?.message?.tool_calls?.[0]?.function?.arguments ||
          "Réponse vide.";
        setMessages((m) => [...m, { role: "assistant", content }]);
      }
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `❌ Erreur réseau/serveur: ${e?.message || e}` },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollTo({ top: 999999, behavior: "smooth" }), 50);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b p-4">
        <h1 className="text-2xl font-bold">🤖 OrgaLife Assistant</h1>
        <p className="text-gray-600">
          Pose des questions, il peut aussi rechercher sur le web.
        </p>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => send("Test: réponds 'pong'")}
            className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
          >
            Debug: ping
          </button>
          <button
            onClick={() => send("Fais une recherche web sur l'inflation au Canada en 2025 et résume.")}
            className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
          >
            Debug: recherche web
          </button>
        </div>
      </header>

      <main className="max-w-4xl w-full mx-auto flex-1 p-4 flex flex-col gap-4">
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto bg-white rounded-lg shadow p-4 space-y-3"
        >
          {messages
            .filter((m) => m.role !== "system")
            .map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded px-3 py-2 whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white ml-auto"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                {m.content}
              </div>
            ))}
          {loading && (
            <div className="text-sm text-gray-500">L’assistant réfléchit…</div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-3 flex gap-2">
          <input
            className="border rounded flex-1 px-3 py-2"
            placeholder="Ex: Trouve-moi les meilleurs taux d'épargne au Canada, et résume."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button
            onClick={() => send()}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded disabled:opacity-60"
          >
            Envoyer
          </button>
        </div>
      </main>
    </div>
  );
}
