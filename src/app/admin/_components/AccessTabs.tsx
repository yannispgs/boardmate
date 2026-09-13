"use client";

import { TabButton, tabBarClass } from "@/components/TabButton";

/** The three angles the access model is read from. */
export type AccessTab = "permissions" | "roles" | "accounts";

/**
 * The bar that switches between the three angles — or nothing at all.
 *
 * A bar of one tab is not a bar: an account without `roles.read` may only read
 * the catalogue, so with the other two withheld there is nothing left to switch
 * between and it goes away whole.
 */
export function AccessTabs({
  shown,
  onSelect,
}: Readonly<{
  shown: AccessTab;
  onSelect: (tab: AccessTab) => void;
}>) {
  return (
    <div className={tabBarClass}>
      <TabButton
        active={shown === "permissions"}
        onClick={() => onSelect("permissions")}
      >
        Permissions
      </TabButton>
      <TabButton active={shown === "roles"} onClick={() => onSelect("roles")}>
        Rôles
      </TabButton>
      <TabButton
        active={shown === "accounts"}
        onClick={() => onSelect("accounts")}
      >
        Comptes
      </TabButton>
    </div>
  );
}
