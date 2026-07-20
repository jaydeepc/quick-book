"use client";

import { useRouter } from "next/navigation";
import { LogoutIcon } from "./icons";

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-ink-soft transition hover:bg-brand-soft hover:text-brand-deep active:scale-95"
    >
      <LogoutIcon className="h-4 w-4" />
      Sign out
    </button>
  );
}
