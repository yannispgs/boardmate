import { TabSkeleton } from "../_components/TabSkeleton";

/** The records tab: the extension tabs, then the grid of table sizes. */
export default function Loading() {
  return <TabSkeleton blocks={2} />;
}
