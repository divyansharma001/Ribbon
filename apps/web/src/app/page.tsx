import { requireUser } from "@/lib/session";

export default async function Home() {
  const user = await requireUser();
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-serif text-3xl font-semibold">Hello, {user.name.split(" ")[0]}</h1>
    </main>
  );
}
