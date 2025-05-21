// CampaignCard component (ensure this is the one being used)
// (Imports: formatEther, formatUnits, useCrowdfundingCampaign, types)

import { useCrowdfundingCampaign } from '../hooks/useCrowdfunding';
import { useAccount } from 'wagmi';
import { parseEther, formatUnits } from 'viem';
import { useState, useEffect } from 'react';
import { getFormattedFlrUsdPrice } from '../utils/ftso';

interface CampaignCardProps {
  address: `0x${string}`;
  onContribute: (amount: string) => Promise<void>;
  onFinalize: () => Promise<void>;
}

export function CampaignCard({ address, onContribute, onFinalize }: CampaignCardProps) {
  const { address: userAddress } = useAccount();
  const [contributionAmount, setContributionAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [flrUsdPrice, setFlrUsdPrice] = useState<string>('0');
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBeneficiaryModalOpen, setIsBeneficiaryModalOpen] = useState(false);

  const {
    campaignInfo,
    isLoadingCampaignInfo,
    errorLoadingInfo,
    contribute,
    isSendingContribution,
    isConfirmingContribution,
    finalizeCampaign,
    isSendingFinalize,
    isConfirmingFinalize,
  } = useCrowdfundingCampaign(address);

  // Fetch FLR/USD price on component mount
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const price = await getFormattedFlrUsdPrice();
        setFlrUsdPrice(price);
      } catch (err) {
        console.error('Error fetching FLR/USD price:', err);
        setFlrUsdPrice('0');
      }
    };
    fetchPrice();
  }, []);

  if (isLoadingCampaignInfo) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (errorLoadingInfo || !campaignInfo) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error loading campaign information</p>
      </div>
    );
  }

  const {
    title,
    beneficiary,
    fundingGoalUsdString,
    totalFundsRaisedFlrString,
    deadlineDate,
    fundingGoalReached,
    campaignClosed,
  } = campaignInfo;

  // Calculate progress percentage and FLR conversion
  const flrPrice = parseFloat(flrUsdPrice) ;
  // Convert USD goal to FLR using the current price
  const goalInFlr = parseFloat(fundingGoalUsdString) / flrPrice;
  const raisedInFlr = parseFloat(totalFundsRaisedFlrString) || 0;
  const progressPercentage = goalInFlr > 0 ? Math.min((raisedInFlr / goalInFlr) * 100, 100) : 0;

  // Calculate time remaining
  const now = new Date();
  const timeLeft = deadlineDate.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(timeLeft / (1000 * 60 * 60 * 24)));
  const isExpired = daysLeft === 0;

  // Format numbers to appropriate precision
  const formatAmount = (amount: number, isUsd: boolean = false) => {
    if (isUsd) {
      return amount.toFixed(2);
    }
    // For FLR, show more precision since the amounts are larger
    return amount.toFixed(4);
  };

  const handleContribute = async () => {
    if (!contributionAmount) {
      setError('Please enter an amount');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await onContribute(contributionAmount);
      setContributionAmount('');
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to contribute');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalize = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await onFinalize();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finalize campaign');
    } finally {
      setIsLoading(false);
    }
  };

  // Format beneficiary address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 space-y-4 border border-pink-100 group">
        <div className="flex justify-between items-start">
          <h3 className="text-xl font-bold text-gray-900 truncate pr-2 group-hover:text-pink-600 transition-colors duration-200">{title}</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
            campaignClosed ? 'bg-red-100 text-red-800' :
            fundingGoalReached ? 'bg-green-100 text-green-800' :
            isExpired ? 'bg-red-100 text-red-800' :
            'bg-green-100 text-green-800'
          }`}>
            {campaignClosed ? 'Closed' :
             fundingGoalReached ? 'Goal Reached' :
             isExpired ? 'Expired' :
             'Active'}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Goal:</span>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900">${formatAmount(parseFloat(fundingGoalUsdString), true)} USD</span>
                <span className="text-pink-400">/</span>
                <span className="font-bold text-gray-900">{formatAmount(goalInFlr)} FLR</span>
              </div>
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Raised:</span>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900">{formatAmount(raisedInFlr)} FLR</span>
                <span className="text-pink-400">/</span>
                <span className="font-bold text-gray-900">${formatAmount(raisedInFlr * flrPrice, true)} USD</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-pink-500 to-pink-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-bold text-gray-900">{progressPercentage.toFixed(1)}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 block mb-1">Beneficiary</span>
            <button
              onClick={() => setIsBeneficiaryModalOpen(true)}
              className="font-mono text-xs md:text-sm truncate block max-w-[200px] text-pink-600 hover:text-pink-800 hover:underline transition-colors duration-200"
              title="Click to view full address"
            >
              {formatAddress(beneficiary)}
            </button>
          </div>
          <div className="text-right">
            <span className="text-gray-600 block mb-1">Time Remaining</span>
            <span className="font-bold text-gray-900">
              {isExpired ? 'Campaign ended' : `${daysLeft} days left`}
            </span>
          </div>
        </div>

        {!campaignClosed && !isExpired && !fundingGoalReached && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            Contribute Now
          </button>
        )}

        {fundingGoalReached && !campaignClosed && (
          <button
            onClick={handleFinalize}
            disabled={isLoading || isSendingFinalize || isConfirmingFinalize}
            className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSendingFinalize ? 'Sending...' :
             isConfirmingFinalize ? 'Confirming...' :
             'Finalize Campaign'}
          </button>
        )}
      </div>

      {/* Contribution Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-slideUp">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Contribute to Campaign</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (FLR)
                </label>
                <input
                  type="number"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  placeholder="Enter amount in FLR"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                  min="0"
                  step="0.01"
                />
                {flrPrice > 0 && contributionAmount && (
                  <p className="mt-1 text-sm text-gray-500">
                    ≈ ${(parseFloat(contributionAmount) * flrPrice).toFixed(2)} USD
                  </p>
                )}
              </div>

              {error && (
                <p className="text-red-600 text-sm">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleContribute}
                  disabled={isLoading || isSendingContribution || isConfirmingContribution}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSendingContribution ? 'Sending...' :
                   isConfirmingContribution ? 'Confirming...' :
                   'Contribute'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Beneficiary Modal */}
      {isBeneficiaryModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-slideUp">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Beneficiary Address</h3>
              <button
                onClick={() => setIsBeneficiaryModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-mono text-sm break-all">{beneficiary}</p>
              </div>

              <a
                href={`https://coston2-explorer.flare.network/address/${beneficiary}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white text-center rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all duration-200"
              >
                View on Explorer
              </a>

              <button
                onClick={() => setIsBeneficiaryModalOpen(false)}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}