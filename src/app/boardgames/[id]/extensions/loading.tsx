import { TabSkeleton } from "../_components/TabSkeleton";

/** The extensions tab: a row of them, then the panel of the open one. */
export default function Loading() {
  return <TabSkeleton blocks={2} wide />;
}
