import "server-only";
import { cache } from "react";
import { getLearningStats } from "../learning/data";
import { levelFor, xpFrom } from "../learning/logic";
import { getRecords } from "../records/data";
import { getFriends } from "./data";

export interface LeagueRow {
  id: string;
  name: string;
  you: boolean;
  weekXp: number;
  streak: number;
  level: string;
}

/** The reader and their friends, ranked by this week's XP. Empty when they have no friends yet. */
export const getLeague = cache(async (userId: string): Promise<LeagueRow[]> => {
  const friends = await getFriends(userId);
  if (friends.length === 0) return [];
  const members = [
    { id: userId, name: "You", you: true },
    ...friends.map((f) => ({ ...f, you: false })),
  ];
  const rows = await Promise.all(
    members.map(async (m) => {
      const [records, stats] = await Promise.all([getRecords(m.id), getLearningStats(m.id)]);
      return {
        id: m.id,
        name: m.name,
        you: m.you,
        weekXp: records.race.thisWeek,
        streak: records.currentStreak,
        level: levelFor(xpFrom(stats)).name,
      };
    }),
  );
  return rows.sort((a, b) => b.weekXp - a.weekXp || Number(b.you) - Number(a.you));
});
