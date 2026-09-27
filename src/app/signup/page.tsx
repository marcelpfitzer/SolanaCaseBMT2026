import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import SignupForm from "./SignupForm";

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <main className="bg-apple-gray px-4 py-16">
      <div className="mx-auto max-w-[420px] rounded-xl bg-white p-8">
        <h1 className="type-tile">Create your account.</h1>
        <p className="type-caption mt-2 mb-8 text-black/60">
          Already registered?{" "}
          <Link href="/login" className="text-apple-link hover:underline">
            Log in
          </Link>
        </p>
        <SignupForm />
      </div>
    </main>
  );
}
