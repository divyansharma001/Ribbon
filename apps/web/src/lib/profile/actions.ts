"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "../session";
import { type SaveResult, saveProfile } from "./data";

const Input = z.object({
  handle: z.string().max(60),
  enabled: z.boolean(),
  showName: z.boolean(),
});

/** Saves the public profile settings from the share page. */
export async function saveProfileAction(input: z.input<typeof Input>): Promise<SaveResult> {
  const user = await requireUser();
  const result = await saveProfile(user.id, Input.parse(input));
  if (result.ok) refresh();
  return result;
}
