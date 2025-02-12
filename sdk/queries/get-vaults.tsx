import type { BaseQueryFilter, BaseSortingFilter } from "@/sdk/types";
import type { TypedRoycoClient } from "@/sdk/client";
import { PostgrestFilterBuilder } from "@supabase/postgrest-js";
import { constructBaseSortingFilterClauses } from "@/sdk/utils";

/**
 * GetVaultsQueryParams defines the parameters for querying vaults.
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
 * Constructs filter clauses for the vaults table.
 */
function constructVaultsFilterClauses(filters: BaseQueryFilter[] = []): (qb: PostgrestFilterBuilder<any>) => PostgrestFilterBuilder<any> {
  return (qb: PostgrestFilterBuilder<any>) => {
    filters.forEach((filter) => {
      switch (filter.id) {
        case "chain_id":
          if (filter.value !== undefined && filter.value !== null) {
            qb = qb.eq("chain_id", filter.value);
          }
          break;
        case "active":
          if (typeof filter.value === "boolean") {
            qb = qb.eq("active", filter.value);
          }
          break;
        case "owner":
          if (filter.value) {
            qb = qb.eq("owner", filter.value);
          }
          break;
        default:
          break;
      }
    });
    return qb;
  };
}

/**
 * Applies search on the vaults table.
 * Updated to search by partner, base_asset, and name.
 */
function applyVaultsSearch(
  qb: PostgrestFilterBuilder<any>,
  searchKey: string | undefined,
): PostgrestFilterBuilder<any> {
  if (!searchKey || !searchKey.trim()) return qb;

  const trimmedSearch = searchKey.trim().toLowerCase();

  return qb.or(
    `partner.ilike.%${trimmedSearch}%,base_asset.ilike.%${trimmedSearch}%,name.ilike.%${trimmedSearch}%`
  );
}

/**
 * Executes the query on the 'vaults' table with filters, sorting, search, and pagination.
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
  // Build the base query with only the columns defined in the new table schema.
  let query = client
    .from("vaults")
    .select(
      `
      id,
      chain_id,
      name,
      owner,
      partner,
      base_asset,
      apy,
      tvl,
      reward_assets,
      active,
      capacity,
      accepted_asset,
      underlying_contract,
      fee_structure
    `,
      { count: "exact" }
    );

  // 1) Apply filters
  query = constructVaultsFilterClauses(filters)(query);

  // 2) Apply search using updated columns
  query = applyVaultsSearch(query, search_key);

  // 3) Sorting
  const sortingClause = constructBaseSortingFilterClauses(sorting);
  if (sortingClause) {
    const [colSort, ...rest] = sortingClause.split(",");
    if (colSort) {
      const [sortCol, sortDirection] = colSort.trim().split(" ");
      query = query.order(sortCol, { ascending: sortDirection?.toLowerCase() === "asc" });
    }
  } else {
    query = query.order("id", { ascending: true });
  }

  // 4) Pagination offset/limit
  const from = page_index * page_size;
  const to = from + page_size - 1;
  query = query.range(from, to);

  // 5) Execute query
  const { data, count, error } = await query.throwOnError();

  if (error) {
    throw error;
  }

  return {
    data: data ?? [],
    count: count ?? 0,
  };
};

/**
 * Returns query options for fetching vaults.
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
  refetchInterval: 1000 * 60,
  refetchOnWindowFocus: false,
});