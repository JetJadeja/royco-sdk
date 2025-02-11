import { useQuery } from "@tanstack/react-query";
import {
  getVaultsQueryOptions,
  type GetVaultsQueryParams,
} from "@/sdk/queries/get-vaults";
import { type RoycoClient, useRoycoClient } from "@/sdk/client";

export type UseVaultsParams = GetVaultsQueryParams;

export const useVaults = ({ page, page_size }: UseVaultsParams) => {
  const client: RoycoClient = useRoycoClient();

  return useQuery({
    ...getVaultsQueryOptions({ client, page, page_size }),
  });
};
