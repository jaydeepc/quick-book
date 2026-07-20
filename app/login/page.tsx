import Image from "next/image";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export const metadata = { title: "Sign in · Quick Block" };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");

  return (
    <main className="qb-backdrop flex min-h-screen flex-col items-center justify-center px-6 py-10">
      <Image
        src="/piramal-logo.svg"
        alt="Piramal Finance"
        width={150}
        height={69}
        priority
        className="mb-8"
      />
      <LoginForm />
    </main>
  );
}
