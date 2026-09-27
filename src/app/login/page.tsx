import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/");
  const { next } = await searchParams;

  return (
    <main className="bg-apple-gray px-4 py-16">
      <div className="mx-auto max-w-[420px] rounded-xl bg-white p-8">
        <h1 className="type-tile">Log in to PayPerRead.</h1>
        <p className="type-caption mt-2 mb-8 text-black/60">
          No account?{" "}
          <Link href="/signup" className="text-apple-link hover:underline">
            Create one
          </Link>
        </p>
        <LoginForm next={typeof next === "string" ? next : undefined} />
      </div>
    </main>
  );
}
