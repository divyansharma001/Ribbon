"use client";

import type { OutlineNode } from "@ribbon/book-schema";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { SoundButton } from "@/components/sound/sound-button";
import { ThemePicker } from "@/components/theme-picker";

interface ReaderShellProps {
  /** Today's goal ring in the top bar. */
  today?: ReactNode;
  bookId: string;
  bookTitle: string;
  chapterId: string;
  chapterTitle: string;
  chapterLabel: string;
  outline: OutlineNode[];
  children: ReactNode;
}

/** Top bar (hides while scrolling down) and the contents drawer around a chapter. */
export function ReaderShell(props: ReaderShellProps) {
  const [barHidden, setBarHidden] = useState(false);
  // The bar shows the chapter name only once the big chapter title has scrolled away.
  const [titleInView, setTitleInView] = useState(true);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 6) return;
      setBarHidden(y > last && y > 80);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const title = document.querySelector(".reader-chapter-title");
    if (!title) return;
    const observer = new IntersectionObserver(
      ([entry]) => setTitleInView(entry?.isIntersecting ?? false),
      { rootMargin: "-56px 0px 0px 0px" },
    );
    observer.observe(title);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-30 border-b border-border/70 bg-bg/90 backdrop-blur-md transition-transform duration-300 ${
          barHidden ? "-translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="reader-bar mx-auto flex h-14 max-w-5xl items-center gap-2 px-3 sm:px-5">
          <Link
            href={`/books/${props.bookId}`}
            className="flex size-10 items-center justify-center rounded-full text-muted hover:bg-surface-muted hover:text-text"
            aria-label={`Back to ${props.bookTitle}`}
          >
            <ChevronLeft />
          </Link>
          {/* Balances the buttons on the right so the title stays centered. */}
          <span className="h-10 w-[7.5rem] shrink-0 max-sm:w-20" aria-hidden="true" />
          <div
            className={`min-w-0 flex-1 text-center transition-opacity duration-200 ${
              titleInView ? "opacity-0" : "opacity-100"
            }`}
            aria-hidden={titleInView}
          >
            <p className="truncate text-[11px] font-semibold tracking-[0.08em] text-accent uppercase">
              {props.chapterLabel}
            </p>
            <p className="truncate text-sm font-medium">{props.chapterTitle}</p>
          </div>
          {props.today}
          <SoundButton />
          <ThemePicker />
          <button
            type="button"
            onClick={() => dialog.current?.showModal()}
            className="flex size-10 items-center justify-center rounded-full text-muted hover:bg-surface-muted hover:text-text"
            aria-label="Contents"
          >
            <ListIcon />
          </button>
        </div>
      </header>

      {props.children}

      <dialog
        ref={dialog}
        className="contents-drawer"
        aria-label="Contents"
        onClick={(e) => {
          // Close when clicking the dimmed backdrop or any link inside.
          if (e.target === dialog.current || (e.target as HTMLElement).closest("a"))
            dialog.current?.close();
        }}
        onKeyDown={() => {}}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.08em] text-accent uppercase">
                {props.chapterLabel}
              </p>
              <p className="truncate font-serif text-lg font-semibold">{props.chapterTitle}</p>
            </div>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-muted hover:text-text"
              aria-label="Close contents"
            >
              <CloseIcon />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Sections">
            <OutlineList nodes={props.outline} />
          </nav>
          <div className="border-t border-border px-5 py-3">
            <Link
              href={`/books/${props.bookId}`}
              className="text-sm font-medium text-accent hover:underline"
            >
              All chapters
            </Link>
          </div>
        </div>
      </dialog>
    </>
  );
}

function OutlineList({ nodes }: { nodes: OutlineNode[] }) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((node) => (
        <li key={node.anchor}>
          <a
            href={`#${node.blockId}`}
            className={`block rounded-lg px-3 py-2 leading-snug hover:bg-surface-muted ${
              node.level === 2
                ? "text-[15px] font-medium"
                : node.level === 3
                  ? "pl-7 text-sm text-muted"
                  : "pl-11 text-[13px] text-muted"
            }`}
          >
            {node.title}
          </a>
          {node.children.length > 0 && <OutlineList nodes={node.children} />}
        </li>
      ))}
    </ul>
  );
}

const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function ChevronLeft() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
