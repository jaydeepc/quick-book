"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "./icons";

export default function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("Copy this link:", text);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition active:scale-95 ${
        copied
          ? "bg-emerald-100 text-emerald-700"
          : "bg-ink text-white hover:bg-ink/90"
      }`}
    >
      {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
      {copied ? "Copied" : label ?? "Copy link"}
    </button>
  );
}
