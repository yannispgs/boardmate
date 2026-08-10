import { redirect } from "next/navigation";

/**
 * The per-game configurations moved into the unified settings page. This route
 * is kept as a permanent redirect so old links / bookmarks still land there.
 */
export default async function ConfigsPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;

  redirect(`/boardgames/${id}/edit`);
}
