// src/hooks/useCrowdfunding.ts
import { useMemo } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseEther, formatUnits, type Address } from 'viem'; // REMOVED parseUnits from here as it's not used for createCampaign
import type { Abi } from 'viem';

//abi import
import CrowdfundingFactoryJSON from '../abis/CrowdfundingFactory.json';
import CrowdfundingCampaignJSON from '../abis/CrowdfundingCampaign.json';


// Replace with your actual deployed factory address
const FACTORY_ADDRESS = '0xc1EAF17ebCD0ef0287E67f992a892A4e727e96c3' as const;

// --- ABI Loading and Validation ---
if (!CrowdfundingFactoryJSON || !Array.isArray(CrowdfundingFactoryJSON.abi)) {
  throw new Error(
    "CrowdfundingFactoryABI not found or invalid. Make sure '../abis/CrowdfundingFactory.json' exists and contains an 'abi' array property."
  );
}
if (!CrowdfundingCampaignJSON || !Array.isArray(CrowdfundingCampaignJSON.abi)) {
  throw new Error(
    "CrowdfundingCampaignABI not found or invalid. Make sure '../abis/CrowdfundingCampaign.json' exists and contains an 'abi' array property."
  );
}
const factoryABI = CrowdfundingFactoryJSON.abi as Abi;
const campaignABI = CrowdfundingCampaignJSON.abi as Abi;

// --- Interfaces and Types ---
export interface CampaignCoreInfo {
  owner: Address;
  beneficiary: Address;
  fundingGoalInUsdScaled: bigint; 
  deadline: bigint;
  totalFundsRaisedWei: bigint;    // FLR in wei
  fundingGoalReached: boolean;
  campaignClosed: boolean;
  title: string;
}

export interface FormattedCampaignInfo extends CampaignCoreInfo {
  fundingGoalUsdString: string;      
  totalFundsRaisedFlrString: string; 
  deadlineDate: Date;
}

export interface FtsoPriceData {
  price: bigint;
  decimals: number;
  timestamp: bigint;
}

// MUST exactly match the return signature of getCampaignInfo in CrowdfundingCampaign.sol
type CampaignInfoTuple = readonly [
  Address,   // 0: owner
  Address,   // 1: beneficiary
  bigint,    // 2: fundingGoalInUsdScaled (this is the USD goal * 1e18 from the contract)
  bigint,    // 3: deadline
  bigint,    // 4: totalFundsRaisedWei (FLR raised in wei)
  boolean,   // 5: fundingGoalReached
  boolean,   // 6: campaignClosed
  string     // 7: title
];

type FtsoPriceTuple = readonly [
  bigint,  // price
  number,  // decimals
  bigint   // timestamp
];


// --- Hook for Factory Interactions ---
export function useCrowdfundingFactory() {
  const { isConnected } = useAccount();
  
  const {
    data: campaignAddresses,
    isLoading: isLoadingCampaigns,
    error: errorLoadingCampaigns,
    refetch: refetchCampaignAddresses,
  } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryABI,
    functionName: 'getCampaigns',
  });

  const { data: createCampaignTxHash, writeContractAsync, isPending: isSendingCreateCampaign } = useWriteContract();

  const { isLoading: isConfirmingCreateCampaign, isSuccess: isCreateCampaignSuccess } = useWaitForTransactionReceipt({
    hash: createCampaignTxHash,
  });

  const handleCreateCampaign = async (
    beneficiary: Address,
    fundingGoalUsd: number,
    durationInDays: number,
    title: string
  ) => {
    // Check wallet connection first
    if (!isConnected) {
      throw new Error('Please connect your wallet first');
    }

    if (!writeContractAsync) {
      throw new Error('Please connect your wallet first');
    }

    // --- Input Validation ---
    if (typeof fundingGoalUsd !== 'number' || isNaN(fundingGoalUsd) || fundingGoalUsd <= 0) {
      throw new Error("Funding goal must be a positive number.");
    }
    if (typeof durationInDays !== 'number' || isNaN(durationInDays) || durationInDays <= 0 || !Number.isInteger(durationInDays)) {
      throw new Error("Duration must be a positive integer for days.");
    }
    if (!title.trim()) {
      throw new Error("Title cannot be empty.");
    }
    if (!beneficiary || !/^0x[a-fA-F0-9]{40}$/.test(beneficiary)) {
      throw new Error("Invalid beneficiary address.");
    }

    const plainUsdGoalForContract = BigInt(Math.trunc(fundingGoalUsd));

    try {
      const txHash = await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: factoryABI,
        functionName: 'createCampaign',
        args: [
          beneficiary,
          plainUsdGoalForContract,
          BigInt(durationInDays),
          title,
        ],
      });
      return txHash;
    } catch (error) {
      console.error('Error creating campaign:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Connector not connected')) {
          throw new Error('Please connect your wallet first');
        }
        if (error.message.includes('User rejected')) {
          throw new Error('Transaction was rejected by user');
        }
        if (error.message.includes('insufficient funds')) {
          throw new Error('Insufficient funds for transaction');
        }
      }
      
      throw new Error('Failed to create campaign. Please try again.');
    }
  };

  return {
    campaignAddresses: campaignAddresses as Address[] | undefined,
    isLoadingCampaigns,
    errorLoadingCampaigns,
    refetchCampaignAddresses,
    createCampaign: handleCreateCampaign,
    createCampaignTxHash,
    isSendingCreateCampaign,
    isConfirmingCreateCampaign,
    isCreateCampaignSuccess,
    isConnected,
  };
}


// --- Hook for Individual Campaign Interactions ---
export function useCrowdfundingCampaign(campaignAddress?: Address) {
  const {
    data: rawCampaignInfo, // This is the tuple from the contract
    isLoading: isLoadingCampaignInfo,
    error: errorLoadingInfo,
    refetch: refetchCampaignInfo,
  } = useReadContract({
    address: campaignAddress,
    abi: campaignABI,
    functionName: 'getCampaignInfo', // Must match contract
    query: {
      enabled: !!campaignAddress, // Only run if campaignAddress is valid
    },
  });

  const {
    data: ftsoPriceDataRaw,
    isLoading: isLoadingFtsoData,
    refetch: refetchFtsoData,
    error: errorLoadingFtso,
  } = useReadContract({
    address: campaignAddress,
    abi: campaignABI,
    functionName: 'getFlrUsdPrice', // Must match contract
    query: {
      enabled: !!campaignAddress,
    },
  });

  const campaignInfo: FormattedCampaignInfo | undefined = useMemo(() => {
    if (!rawCampaignInfo) {
      // console.log(`HOOK_CAMPAIGN (${campaignAddress}): rawCampaignInfo is undefined.`);
      return undefined;
    }

    const tuple = rawCampaignInfo as CampaignInfoTuple;

    // tuple[2] is fundingGoalInUsdScaled from the contract (e.g., 100 * 10^18)
    const contractScaledGoal = tuple[2];
    // This formats the on-chain scaled bigint into a human-readable string (e.g., "100.00")
    const humanReadableUsdGoal = formatUnits(contractScaledGoal, 18);

    // console.log(`HOOK_CAMPAIGN (${campaignAddress}): Raw contractScaledGoal (tuple[2]): ${contractScaledGoal?.toString()}`);
    // console.log(`HOOK_CAMPAIGN (${campaignAddress}): Derived humanReadableUsdGoal: "${humanReadableUsdGoal}"`);

    return {
      owner: tuple[0],
      beneficiary: tuple[1],
      fundingGoalInUsdScaled: contractScaledGoal, // Store the raw on-chain scaled value
      deadline: tuple[3],
      totalFundsRaisedWei: tuple[4],
      fundingGoalReached: tuple[5],
      campaignClosed: tuple[6],
      title: tuple[7],
      // No description or imageUrl if not returned by getCampaignInfo

      // Derived formatted strings:
      fundingGoalUsdString: humanReadableUsdGoal, // This is for UI display
      totalFundsRaisedFlrString: formatUnits(tuple[4], 18),
      deadlineDate: new Date(Number(tuple[3]) * 1000),
    };
  }, [rawCampaignInfo, campaignAddress]); // campaignAddress added to dep array for logging context

  const ftsoPrice: FtsoPriceData | undefined = useMemo(() => {
    if (!ftsoPriceDataRaw) return undefined;
    const tuple = ftsoPriceDataRaw as FtsoPriceTuple;
    return { price: tuple[0], decimals: tuple[1], timestamp: tuple[2] };
  }, [ftsoPriceDataRaw]);

  // --- Write Functions (Contribute, Finalize) ---
  const { data: contributeTxHash, writeContractAsync: contributeWriteAsync, isPending: isSendingContribution } = useWriteContract();
  const { isLoading: isConfirmingContribution, isSuccess: isContributeSuccess } = useWaitForTransactionReceipt({ hash: contributeTxHash });

  const handleContribute = async (amountFlr: string) => {
    if (!contributeWriteAsync || !campaignAddress) {
        console.error("HOOK_CAMPAIGN: Contribute function or campaign address is not available.");
        throw new Error("Contribute function or campaign address not ready.");
    }
    if (parseFloat(amountFlr) <= 0) {
        console.error("HOOK_CAMPAIGN: Contribution amount must be positive.");
        throw new Error("Contribution amount must be positive.");
    }
    const amountWei = parseEther(amountFlr);
    try {
        console.log(`HOOK_CAMPAIGN (${campaignAddress}): Contributing ${amountFlr} FLR (${amountWei} wei)`);
        return await contributeWriteAsync({
            address: campaignAddress,
            abi: campaignABI,
            functionName: 'contribute', // This MUST match campaign contract
            value: amountWei,
        });
    } catch(error) {
        console.error(`HOOK_CAMPAIGN (${campaignAddress}): Error contributing:`, error);
        throw error;
    }
  };

  const { data: finalizeTxHash, writeContractAsync: finalizeWriteAsync, isPending: isSendingFinalize } = useWriteContract();
  const { isLoading: isConfirmingFinalize, isSuccess: isFinalizeSuccess } = useWaitForTransactionReceipt({ hash: finalizeTxHash });

  const handleFinalizeCampaign = async () => {
    if (!finalizeWriteAsync || !campaignAddress) {
        console.error("HOOK_CAMPAIGN: Finalize function or campaign address is not available.");
        throw new Error("Finalize function or campaign address not ready.");
    }
    try {
        console.log(`HOOK_CAMPAIGN (${campaignAddress}): Finalizing campaign.`);
        return await finalizeWriteAsync({
            address: campaignAddress,
            abi: campaignABI,
            functionName: 'finalizeCampaign', // This MUST match campaign contract
        });
    } catch(error) {
        console.error(`HOOK_CAMPAIGN (${campaignAddress}): Error finalizing:`, error);
        throw error;
    }
  };

  return {
    campaignInfo,
    isLoadingCampaignInfo,
    errorLoadingInfo,
    refetchCampaignInfo,

    ftsoPrice,
    isLoadingFtsoPrice: isLoadingFtsoData,
    errorLoadingFtso,
    refetchFtsoPrice: refetchFtsoData,

    contribute: handleContribute,
    contributeTxHash,
    isSendingContribution,
    isConfirmingContribution,
    isContributeSuccess,

    finalizeCampaign: handleFinalizeCampaign,
    finalizeTxHash,
    isSendingFinalize,
    isConfirmingFinalize,
    isFinalizeSuccess,
  };
}