import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export const metadata = { title: "Dashboard · Quick Block" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4">
          <Link href="/admin" className="flex items-center gap-3">
            <Image
              src="/piramal-logo.svg"
              alt="Piramal Finance"
              width={92}
              height={42}
              priority
            />
            <span className="hidden h-6 w-px bg-line sm:block" />
            <span className="hidden text-sm font-extrabold tracking-tight text-ink sm:block">
              Quick <span className="text-brand">Block</span>
            </span>
          </Link>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
