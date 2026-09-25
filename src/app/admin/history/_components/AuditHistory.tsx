"use client";

import { useState } from "react";

import { ErrorText } from "@/components/ErrorText";
import { ListState } from "@/components/ListState";
import type { AuditFilter } from "@/lib/domain";
import { filterAuditEntries } from "@/lib/domain";
import { useAuditLog } from "@/lib/hooks/use-audit-log";
import { AuditEntryCardList } from "./AuditEntryCardList";
import { AuditFilters } from "./AuditFilters";

/**
 * The modification history, narrowed and paged.
 *
 * The filters work on what has already been read rather than on the whole
 * table: the history is read newest-first and the question it answers is « qu'a
 * -t-il bougé ces derniers temps », not « retrouve-moi une ligne de juin ».
 * Reaching further back is the same gesture either way — « Plus ancien ».
 */
export function AuditHistory() {
  const { entries, loading, loadingMore, error, hasMore, loadMore } =
    useAuditLog();
  const [filter, setFilter] = useState<AuditFilter>({});
  const shown = filterAuditEntries(entries, filter);
  const narrowed = Object.values(filter).some(value => value !== undefined);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 pb-10">
      <AuditFilters entries={entries} filter={filter} onChange={setFilter} />

      <ErrorText message={error} />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <ListState
          loading={loading}
          empty={shown.length === 0}
          emptyLabel={
            narrowed ? (
              <>Aucune modification ne correspond à ce filtre.</>
            ) : (
              <>Aucune modification enregistrée.</>
            )
          }
        >
          <AuditEntryCardList entries={shown} />
        </ListState>

        {/* Offered on the whole history and not on the filtered view: what the
            filter hides is still read, so a narrowed list that looks finished
            may simply have nothing older in the page already fetched. */}
        {hasMore && !loading ? (
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="self-center rounded-lg border border-black/10 px-4 py-2 text-sm font-medium transition hover:bg-black/5 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/5"
          >
            {loadingMore ? "Chargement…" : "Plus ancien"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
