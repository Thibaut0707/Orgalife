"use client";
import Link from "next/link";

export default function ChatLauncher() {
  return (
    <Link
      href="/assistant"
      className="fixed bottom-5 right-5 z-50 shadow-lg rounded-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
      aria-label="Ouvrir le chat de l'assistant"
    >
      🤖 Chat
    </Link>
  );
}
