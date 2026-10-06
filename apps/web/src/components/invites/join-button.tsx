"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { INVITE_COOKIE } from "@/lib/invites/logic";

/** Keeps the invite code for the trip through Google, then signs in. */
export function JoinButton({ code }: { code: string }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      className="home-button join-button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        // biome-ignore lint/suspicious/noDocumentCookie: short-lived first-party cookie read at sign-up
        document.cookie = `${INVITE_COOKIE}=${encodeURIComponent(code)}; path=/; max-age=1800; samesite=lax`;
        const { error } = await authClient.signIn.social({
          provider: "google",
          callbackURL: "/welcome",
          errorCallbackURL: "/login?error=denied",
        });
        if (error) setPending(false);
      }}
    >
      {pending ? "Opening Google…" : "Join with Google"}
    </button>
  );
}
