import Image from "next/image";
import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import { CalendarIcon, LinkIcon, DownloadIcon } from "@/components/icons";

export default async function Home() {
  const authed = await isAdmin();

  return (
    <main className="qb-backdrop flex min-h-screen flex-col items-center px-6 py-10">
      <Image
        src="/piramal-logo.svg"
        alt="Piramal Finance"
        width={170}
        height={78}
        priority
      />

      <div className="qb-pop-in mt-8 w-full max-w-md rounded-3xl bg-white p-6 shadow-card sm:p-8">
        <div className="overflow-hidden rounded-2xl bg-brand-faint">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/hero.jpg" alt="" className="h-44 w-full object-cover sm:h-52" />
        </div>

        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-ink">
          Quick <span className="text-brand">Block</span>
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          Share available slots, collect everyone&rsquo;s preferred times, and block
          calendars fast.
        </p>

        <ul className="mt-5 space-y-3 text-sm font-medium text-ink">
          <li className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-deep">
              <CalendarIcon className="h-4.5 w-4.5" />
            </span>
            Create an event with open dates &amp; times
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-deep">
              <LinkIcon className="h-4.5 w-4.5" />
            </span>
            Share one link per group — no sign-in needed
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-deep">
              <DownloadIcon className="h-4.5 w-4.5" />
            </span>
            Download a PDF and block the calendars
          </li>
        </ul>

        <Link
          href={authed ? "/admin" : "/login"}
          className="mt-7 flex h-13 w-full items-center justify-center rounded-2xl bg-brand text-[15px] font-bold text-white shadow-pop transition hover:bg-brand-deep active:scale-[0.98]"
        >
          {authed ? "Go to dashboard" : "Admin sign in"}
        </Link>
      </div>

      <p className="mt-8 text-xs font-medium text-ink-faint">
        Quick Block · Piramal Finance
      </p>
    </main>
  );
}
