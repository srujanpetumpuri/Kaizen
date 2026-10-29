import { getSession } from "@/lib/session";

export const json = (data: unknown, status = 200) => Response.json(data, { status });

// Resolves to the signed-in user's id, or null when there is no session.
export async function currentUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user.id ?? null;
}
