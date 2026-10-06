import { FRIEND_CHAPTER_XP, FRIEND_STREAK_DAYS } from "@/lib/invites/logic";

/** What inviting a friend brings, for both of you. */
export const PERKS = [
  {
    mark: `+${FRIEND_CHAPTER_XP}`,
    title: `${FRIEND_CHAPTER_XP} XP each`,
    detail: "When your friend finishes their first chapter.",
  },
  {
    mark: "❄",
    title: "A streak freeze each",
    detail: `When your friend reaches a ${FRIEND_STREAK_DAYS}-day streak.`,
  },
  {
    mark: "+1",
    title: "Connector badges",
    detail: "For 1, 3, and 5 friends who finish a chapter.",
  },
  {
    mark: "≡",
    title: "Friends league",
    detail: "Race each other on weekly XP.",
  },
] as const;

export function PerkList() {
  return (
    <ul className="perk-list">
      {PERKS.map((p) => (
        <li key={p.title} className="perk">
          <span
            className="share-mark"
            data-long={p.mark.length > 2 || undefined}
            aria-hidden="true"
          >
            {p.mark}
          </span>
          <span>
            <span className="perk-title">{p.title}</span>
            <span className="perk-detail">{p.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
