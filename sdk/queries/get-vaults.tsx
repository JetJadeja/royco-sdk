import type { TypedRoycoClient } from "@/sdk/client";
import type { BaseQueryFilter, BaseSortingFilter } from "@/sdk/types";
import { constructBaseSortingFilterClauses } from "@/sdk/utils";
import { PostgrestFilterBuilder } from "@supabase/postgrest-js";

/**
 * We define how the user sets these parameters, similarly to the "enriched" approach
 */
export type GetVaultsQueryParams = {
  chain_id?: number;
  page_index?: number;  // zero-based
  page_size?: number;
  filters?: BaseQueryFilter[];
  sorting?: BaseSortingFilter[];
  search_key?: string;  // used for searching by name, partner, etc.
};

export type GetVaultsQueryOptionsParams = GetVaultsQueryParams & {
  client: TypedRoycoClient;
};

/**
 * Construct filter clauses for the vaults table.
 * This is similar to how we do it for enriched markets, but simpler for demonstration.
 */
function constructVaultsFilterClauses(filters: BaseQueryFilter[] = []): (qb: PostgrestFilterBuilder<any>) => PostgrestFilterBuilder<any> {
  return (qb: PostgrestFilterBuilder<any>) => {
    let hasClause = false;

    filters.forEach((filter) => {
      // Example: filter by chain_id, active, owner, etc.
      switch (filter.id) {
        case "chain_id":
          // eq => chain_id = filter.value
          if (filter.value !== undefined && filter.value !== null) {
            qb = qb.eq("chain_id", filter.value);
            hasClause = true;
          }
          break;
        case "active":
          // eq => active = filter.value
          if (typeof filter.value === "boolean") {
            qb = qb.eq("active", filter.value);
            hasClause = true;
          }
          break;
        case "owner":
          // eq => owner = filter.value
          if (filter.value) {
            qb = qb.eq("owner", filter.value);
            hasClause = true;
          }
          break;
        // Add other filters as needed...
        default:
          break;
      }
    });

    return qb;
  };
}

/**
 * We do a "like" or "ilike" search on name/partner/management_partner, etc.
 */
function applyVaultsSearch(
  qb: PostgrestFilterBuilder<any>,
  searchKey: string | undefined,
): PostgrestFilterBuilder<any> {
  if (!searchKey || !searchKey.trim()) return qb;

  const trimmedSearch = searchKey.trim().toLowerCase();

  // Example: searching by partner or base_asset or chain_name
  // We do a case-insensitive "ilike"
  return qb.or(
    `partner.ilike.%${trimmedSearch}%,base_asset.ilike.%${trimmedSearch}%,chain_name.ilike.%${trimmedSearch}%`
  );
}

/**
 * This function runs the query on the 'vaults' table,
 * applying filters, sorting, search, and pagination.
 */
export const getVaultsQueryFunction = async ({
  client,
  chain_id,
  page_index = 0,
  page_size = 20,
  filters = [],
  sorting = [],
  search_key,
}: GetVaultsQueryOptionsParams) => {
  // Build the base query
  let query = client
    .from("vaults")
    .select(
      `
      id,
      chain_id,
      chain_name,
      owner,
      partner,
      base_asset,
      apy,
      tvl,
      reward_assets,
      active,
      fullness,
      capacity,
      market_list,
      min_lockup,
      max_lockup,
      management_partner,
      accepted_asset,
      underlying_contract,
      fee_structure
    `,
      { count: "exact" },
    );

  // 1) Apply filters
  query = constructVaultsFilterClauses(filters)(query);

  // 2) Apply search
  query = applyVaultsSearch(query, search_key);

  // 3) Sorting
  const sortingClause = constructBaseSortingFilterClauses(sorting);
  // "constructBaseSortingFilterClauses" returns a string like "apy ASC, tvl DESC"
  if (sortingClause) {
    // If you want multiple columns, you'll have them in the single string, separated by commas
    const [colSort, ...rest] = sortingClause.split(",");
    // You could do multiple sorts by looping, but we’ll just do the first for demonstration
    if (colSort) {
      const [sortCol, sortDirection] = colSort.trim().split(" ");
      query = query.order(sortCol, { ascending: sortDirection?.toLowerCase() === "asc" });
    }
    // If we wanted multiple sorts, we'd parse each CSV piece and order by each in turn
  } else {
    // default sort if no user sort
    query = query.order("id", { ascending: true });
  }

  // 4) Pagination offset/limit
  const from = page_index * page_size;
  const to = from + page_size - 1;
  query = query.range(from, to);

  // 5) Execute
  const { data, count, error } = await query.throwOnError();

  if (error) {
    throw error;
  }

  // Return shape consistent with "enriched" style: { data, count }
  return {
    data: data ?? [],
    count: count ?? 0,
  };
};

/**
 * getVaultsQueryOptions => final QO for react-query
 */
export const getVaultsQueryOptions = ({
  client,
  chain_id,
  page_index,
  page_size,
  filters,
  sorting,
  search_key,
}: GetVaultsQueryOptionsParams) => ({
  queryKey: [
    "get-vaults",
    {
      chain_id,
      page_index,
      page_size,
      filters,
      sorting,
      search_key,
    },
  ],
  queryFn: () =>
    getVaultsQueryFunction({
      client,
      chain_id,
      page_index,
      page_size,
      filters,
      sorting,
      search_key,
    }),
  placeholderData: (previousData: any) => previousData,
  refetchInterval: 1000 * 60, // 1 minute
  refetchOnWindowFocus: false,
});