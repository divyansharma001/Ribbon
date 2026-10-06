"use client";

import { useState, useTransition } from "react";
import { saveProfileAction } from "@/lib/profile/actions";
import { HANDLE } from "@/lib/profile/logic";

/** Turn the public profile on or off, pick a handle, and choose whether to show the name. */
export function ProfileForm(props: {
  handle: string;
  enabled: boolean;
  showName: boolean;
  name: string;
  site: string;
}) {
  const [handle, setHandle] = useState(props.handle);
  const [enabled, setEnabled] = useState(props.enabled);
  const [showName, setShowName] = useState(props.showName);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const clean = handle.trim().toLowerCase();
  const valid = HANDLE.test(clean);

  const save = (next: { enabled?: boolean; showName?: boolean } = {}) => {
    const values = { handle: clean, enabled, showName, ...next };
    if (!HANDLE.test(values.handle)) {
      setMessage("Use 3 to 30 lowercase letters, digits, or dashes.");
      return;
    }
    start(async () => {
      const result = await saveProfileAction(values);
      setMessage(
        result.ok
          ? values.enabled
            ? "Saved. Your profile is public."
            : "Saved. Your profile is private."
          : result.error === "taken"
            ? "That handle is taken. Try another."
            : "Use 3 to 30 lowercase letters, digits, or dashes.",
      );
    });
  };

  return (
    <div className="share-form" aria-busy={pending}>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        className="goal-switch-row"
        onClick={() => {
          setEnabled(!enabled);
          save({ enabled: !enabled });
        }}
      >
        <span>
          <span className="goal-settings-label">Public profile</span>
          <span className="goal-settings-hint">
            Shows your level, streak, badges, and chapter progress. Never your notes or the book's
            text.
          </span>
        </span>
        <span className="menu-switch" data-on={enabled ? "true" : "false"} aria-hidden="true" />
      </button>

      <label className="share-handle">
        <span className="goal-settings-label">Handle</span>
        <span className="share-handle-field">
          <span className="share-handle-prefix">{props.site.replace(/^https?:\/\//, "")}/u/</span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onBlur={() => clean !== props.handle && valid && save()}
            spellCheck={false}
            autoCapitalize="none"
            autoComplete="off"
            aria-invalid={!valid}
          />
        </span>
      </label>

      <button
        type="button"
        role="switch"
        aria-checked={showName}
        className="goal-switch-row"
        onClick={() => {
          setShowName(!showName);
          save({ showName: !showName });
        }}
      >
        <span>
          <span className="goal-settings-label">Show my name</span>
          <span className="goal-settings-hint">
            {showName ? `Shown as "${props.name}".` : `Shown as "${clean}".`}
          </span>
        </span>
        <span className="menu-switch" data-on={showName ? "true" : "false"} aria-hidden="true" />
      </button>

      <p className="set-status" role="status">
        {message ?? (enabled ? "Your profile is public." : "Your profile is private.")}
      </p>
    </div>
  );
}

/** A snippet with a copy button. */
export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="share-copy">
      <div className="share-copy-head">
        <span className="goal-settings-label">{label}</span>
        <button
          type="button"
          className="share-copy-button"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="share-code">
        <code>{value}</code>
      </pre>
    </div>
  );
}
