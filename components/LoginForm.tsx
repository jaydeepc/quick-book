"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockIcon } from "./icons";

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(false);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className={`qb-pop-in w-full max-w-sm rounded-3xl bg-white p-6 shadow-card sm:p-8 ${
        error ? "qb-shake" : ""
      }`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-deep">
        <LockIcon className="h-5.5 w-5.5" />
      </span>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">
        Admin sign in
      </h1>
      <p className="mt-1 text-sm text-ink-soft">Enter the admin password to continue.</p>

      <input
        type="password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setError(false);
        }}
        placeholder="Password"
        autoFocus
        className={`mt-5 h-13 w-full rounded-2xl border-2 bg-cream px-4 text-[15px] font-semibold text-ink outline-none transition placeholder:font-medium placeholder:text-ink-faint focus:border-brand focus:bg-white ${
          error ? "border-brand" : "border-line"
        }`}
      />
      {error && (
        <p className="mt-2 text-xs font-bold text-brand-deep">
          That password didn&rsquo;t match. Try again.
        </p>
      )}

      <button
        type="submit"
        disabled={!password || busy}
        className="mt-5 h-13 w-full rounded-2xl bg-brand text-[15px] font-bold text-white shadow-pop transition hover:bg-brand-deep active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
