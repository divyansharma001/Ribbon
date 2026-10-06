"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getBook } from "../books";
import { requireUser } from "../session";
import { type CreateResult, confirmOwnership, createInvite, revokeInvite } from "./data";

/** Makes a new invite link, if the reader has invites left. */
export async function createInviteAction(): Promise<CreateResult> {
  const user = await requireUser();
  const result = await createInvite(user.id, user.email);
  if (result.ok) refresh();
  return result;
}

/** Cancels an unused invite link. */
export async function revokeInviteAction(inviteId: string): Promise<void> {
  const user = await requireUser();
  await revokeInvite(user.id, z.uuid().parse(inviteId));
  refresh();
}

/** The reader confirms they own a copy of the book, which unlocks it. */
export async function confirmOwnershipAction(bookId: string): Promise<void> {
  const user = await requireUser();
  const book = await getBook(z.string().max(100).parse(bookId));
  if (!book) throw new Error("Unknown book");
  await confirmOwnership(user.id, book.id);
}
