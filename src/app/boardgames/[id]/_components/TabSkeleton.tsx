/**
 * What a tab shows while its own data is still on its way.
 *
 * The grey blocks are the smaller half of the point. The bigger one is that a
 * `loading.tsx` makes Next wrap the tab in a Suspense boundary, which lets the
 * router **commit the navigation straight away** instead of holding the old tab
 * up until the server has answered. Without one, a tab of this page is a
 * dynamic route with nothing to show in the meantime, so the click looks like a
 * click that missed — the pill only moves once the data lands.
 *
 * With one, the pill moves on the press and the wait happens underneath it,
 * where a wait belongs. The fallback is also prefetched with the route, so the
 * hesitation disappears rather than being merely dressed up.
 */
export function TabSkeleton({
  blocks,
  wide = false,
}: Readonly<{
  /** Roughly how many cards the real tab lays out, so the swap doesn't jump. */
  blocks: number;
  /** Whether this tab uses the full width (the extensions one and its map). */
  wide?: boolean;
}>) {
  return (
    <div
      data-testid="tab-skeleton"
      // `animate-pulse` and nothing that moves position: a skeleton that slides
      // is read as content arriving, and then arrives a second time.
      className={`flex w-full animate-pulse flex-col gap-6 ${
        wide ? "" : "max-w-2xl"
      }`}
    >
      {/* The line of introduction every tab opens on. */}
      <div className="h-4 w-2/3 rounded bg-black/10 dark:bg-white/10" />

      {Array.from({ length: blocks }, (_, i) => i).map(i => (
        <div
          key={i}
          className="h-28 rounded-xl border border-black/5 bg-black/[0.03] dark:border-white/5 dark:bg-white/[0.03]"
        />
      ))}
    </div>
  );
}
