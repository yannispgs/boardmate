import { redirect } from "next/navigation";

/**
 * A game's page has no content of its own — it is its tabs. Opening it lands on
 * the first one, which is also where an old `/edit` bookmark already points.
 */
export default async function BoardgamePage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;

  redirect(`/boardgames/${id}/edit`);
}
