"use client";

import Image from "next/image";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="qb-backdrop flex min-h-screen flex-col items-center justify-center px-6 py-10 text-center">
      <Image src="/piramal-logo.svg" alt="Piramal Finance" width={130} height={60} />
      <div className="qb-pop-in mt-8 w-full max-w-sm rounded-3xl bg-white p-8 shadow-card">
        <p className="text-5xl">📡</p>
        <h1 className="mt-4 text-xl font-extrabold text-ink">
          We couldn&rsquo;t reach the server
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          The database didn&rsquo;t answer. It&rsquo;s usually back in a moment —
          please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 h-12 w-full rounded-2xl bg-brand text-sm font-bold text-white shadow-pop transition hover:bg-brand-deep active:scale-[0.98]"
        >
          Try again
        </button>
      </div>
      <p className="mt-8 text-xs font-medium text-ink-faint">
        Quick Block · Piramal Finance
      </p>
    </main>
  );
}
