import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { SoundLab } from "./sound-lab";

/** Development-only page that measures the page-turn sound. */
export default async function SoundLabPage() {
  if (process.env.NODE_ENV === "production") notFound();
  await requireUser();
  return <SoundLab />;
}
