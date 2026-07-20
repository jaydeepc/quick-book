import Link from "next/link";
import CreateEventForm from "@/components/CreateEventForm";
import { ChevronLeftIcon } from "@/components/icons";

export const metadata = { title: "New event · Quick Block" };

export default function NewEventPage() {
  return (
    <div>
      <div className="flex items-center gap-2 pb-4">
        <Link
          href="/admin"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-brand-soft hover:text-brand-deep"
          aria-label="Back to dashboard"
        >
          <ChevronLeftIcon />
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">New event</h1>
      </div>
      <CreateEventForm />
    </div>
  );
}
