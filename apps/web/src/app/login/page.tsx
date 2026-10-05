import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { RibbonMark } from "@/components/ribbon-mark";
import { safeNextPath } from "@/lib/safe-redirect";
import { getSession } from "@/lib/session";
import { GoogleSignIn } from "./google-sign-in";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  if (await getSession()) redirect(next as Route);
  const denied = params.error !== undefined;

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="w-full max-w-[22rem]">
        <RibbonMark className="h-10 w-[30px] text-accent" />
        <h1 className="mt-8 font-serif text-[2.5rem] leading-none font-semibold tracking-tight">
          Ribbon
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-pretty text-muted">
          Read, remember, and never lose your place.
        </p>

        {denied && (
          <p
            role="alert"
            className="mt-8 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm leading-relaxed text-pretty text-text"
          >
            That account can’t sign in. Ribbon is a private library.
          </p>
        )}

        <div className="mt-10">
          <GoogleSignIn next={next} />
        </div>
      </div>
    </main>
  );
}
