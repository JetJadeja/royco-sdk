import type { TypedRoycoClient } from "@/sdk/client";

export type GetVaultsQueryParams = {
  page?: number;
  page_size?: number;
};

export type GetVaultsQueryOptionsParams = {
  client: TypedRoycoClient;
} & GetVaultsQueryParams;

export const getVaultsQueryFunction = async ({
  client,
  page = 0,
  page_size = 50,
}: GetVaultsQueryOptionsParams) => {
  const { data, count } = await client
    .from("vaults" as any)
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
    )
    .limit(page_size)
    .range(page * page_size, page * page_size + (page_size - 1))
    .order("id", { ascending: true })
    .throwOnError();

  return { data, count };
};

export const getVaultsQueryOptions = ({
  client,
  page,
  page_size,
}: GetVaultsQueryOptionsParams) => ({
  queryKey: [
    "get-vaults",
    {
      page,
      page_size,
    },
  ],
  queryFn: () => getVaultsQueryFunction({ client, page, page_size }),
  placeholderData: (previousData: any) => previousData,
  refetchInterval: 1000 * 60, // 1 minute
  refetchOnWindowFocus: false,
});
