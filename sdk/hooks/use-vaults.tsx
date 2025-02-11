import { useQuery } from "@tanstack/react-query";
import type { BaseQueryFilter, BaseSortingFilter, CustomTokenData } from "@/sdk/types";
import { type RoycoClient, useRoycoClient } from "@/sdk/client";
import {
  getVaultsQueryOptions,
  GetVaultsQueryParams,
} from "@/sdk/queries/get-vaults";

/**
 * This matches the style of `useEnrichedMarkets`.
 * We now accept chain_id, page_index, page_size, filters, sorting, search_key, etc.
 */

export type UseVaultsParams = GetVaultsQueryParams & {
  enabled?: boolean;
};

export const useVaults = ({
  chain_id,
  page_index = 0,
  page_size = 20,
  filters = [],
  sorting = [],
  search_key,
  enabled = true,
}: UseVaultsParams) => {
  const client: RoycoClient = useRoycoClient();

  const queryResult = useQuery({
    ...getVaultsQueryOptions({
      client,
      chain_id,
      page_index,
      page_size,
      filters,
      sorting,
      search_key,
    }),
    enabled,
  });

  // The resolved data or an empty array
  const data = queryResult.data?.data ?? [];
  const count = queryResult.data?.count ?? 0;

  return {
    ...queryResult,
    data,
    count,
  };
};