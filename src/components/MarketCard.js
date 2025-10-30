import React, { useState } from 'react';
import './MarketCard.css';
import { useContractWrite, usePrepareContractWrite, useContractRead } from 'wagmi';
import { contractAddress, contractABI, tokenAddress, tokenABI } from '../constants';
import { parseUnits, formatUnits } from 'viem';

function MarketCard({
  id, question, date, yesBets, noBets, arbitrator, outcome, userAddress,
  weightedYes, weightedNo
}) {
  const [betAmount, setBetAmount] = useState('');
  const [showBetting, setShowBetting] = useState(false);

  const betAmountParsed = betAmount ? parseUnits(betAmount, 6) : 0n;

  // --- Read Token Allowance ---
  const { data: allowance } = useContractRead({
    address: tokenAddress, abi: tokenABI, functionName: 'allowance',
    args: [userAddress, contractAddress], enabled: Boolean(userAddress), watch: true,
  });

  // --- "Approve" Token Hook ---
  const { config: configApprove } = usePrepareContractWrite({
    address: tokenAddress, abi: tokenABI, functionName: 'approve',
    args: [contractAddress, betAmountParsed], enabled: Boolean(betAmountParsed > 0n),
  });
  const { isLoading: isLoadingApprove, isSuccess: isSuccessApprove, write: writeApprove } = useContractWrite(configApprove);

  // --- "Bet" Hooks ---
  const { config: configYes } = usePrepareContractWrite({
    address: contractAddress, abi: contractABI, functionName: 'placeBet',
    args: [id, true, betAmountParsed],
    enabled: Boolean(betAmountParsed > 0n && allowance >= betAmountParsed),
  });
  const { isLoading: isLoadingYes, isSuccess: isSuccessYes, write: writeYes } = useContractWrite(configYes);

  const { config: configNo } = usePrepareContractWrite({
    address: contractAddress, abi: contractABI, functionName: 'placeBet',
    args: [id, false, betAmountParsed],
    enabled: Boolean(betAmountParsed > 0n && allowance >= betAmountParsed),
  });
  const { isLoading: isLoadingNo, isSuccess: isSuccessNo, write: writeNo } = useContractWrite(configNo);

  // --- Resolution Hooks ---
  const { config: configResolveYes } = usePrepareContractWrite({
    address: contractAddress, abi: contractABI, functionName: 'resolveMarket', args: [id, true],
  });
  const { isLoading: isLoadingResolveYes, isSuccess: isSuccessResolveYes, write: writeResolveYes } = useContractWrite(configResolveYes);

  const { config: configResolveNo } = usePrepareContractWrite({
    address: contractAddress, abi: contractABI, functionName: 'resolveMarket', args: [id, false],
  });
  const { isLoading: isLoadingResolveNo, isSuccess: isSuccessResolveNo, write: writeResolveNo } = useContractWrite(configResolveNo);

  // --- Withdraw Hook ---
  const { config: configWithdraw } = usePrepareContractWrite({
    address: contractAddress, abi: contractABI, functionName: 'withdraw', args: [id],
  });
  const { isLoading: isLoadingWithdraw, isSuccess: isSuccessWithdraw, write: writeWithdraw } = useContractWrite(configWithdraw);

  // --- Read User's Bet ---
  const { data: userBets } = useContractRead({
    address: contractAddress, abi: contractABI, functionName: 'getUserBet',
    args: [id, userAddress], enabled: Boolean(userAddress), watch: true,
  });

  // --- Calculate Probabilities ---
  const calculateProbabilities = () => {
    const totalWeighted = weightedYes + weightedNo;
    if (totalWeighted === 0n) {
      return { yesProb: 50, noProb: 50 };
    }
    const yesProb = Number((weightedYes * 100n) / totalWeighted);
    const noProb = 100 - yesProb;
    return { yesProb, noProb };
  };

  const { yesProb, noProb } = calculateProbabilities();
  const totalPool = formatUnits(yesBets + noBets, 6);
  const isResolved = Number(outcome) === 1 || Number(outcome) === 2;
  const isArbitrator = userAddress && arbitrator && (userAddress.toLowerCase() === arbitrator.toLowerCase());
  const hasSufficientAllowance = allowance >= betAmountParsed;
  const showApproveButton = !hasSufficientAllowance && betAmountParsed > 0n;

  // Check if user won
  const yesBetAmount = userBets ? userBets[0] : 0n;
  const noBetAmount = userBets ? userBets[1] : 0n;
  const hasWonOnYes = Number(outcome) === 1 && yesBetAmount > 0n;
  const hasWonOnNo = Number(outcome) === 2 && noBetAmount > 0n;
  const userWon = hasWonOnYes || hasWonOnNo;

  return (
    <div className={`market-card-modern ${isResolved ? 'resolved' : ''}`}>
      {/* Market Header */}
      <div className="market-header">
        <div className="market-question">{question}</div>
        <div className="market-date">
          <span className="date-icon">📅</span>
          {date}
        </div>
      </div>

      {/* VS Section */}
      <div className="vs-section">
        {/* YES Side */}
        <div className={`outcome-side yes-side ${isResolved && Number(outcome) === 1 ? 'winner' : ''}`}>
          <div className="outcome-icon">
            <div className="icon-circle yes-circle">
              {isResolved && Number(outcome) === 1 ? '🏆' : '✅'}
            </div>
          </div>
          <div className="outcome-label">YES</div>
          <div className="outcome-prob">{yesProb}%</div>
          <div className="outcome-pool">{formatUnits(yesBets, 6)} USDC</div>
        </div>

        {/* Center VS */}
        <div className="vs-divider">
          <div className="vs-text">VS</div>
          <div className="vs-pool">
            <div className="pool-label">Total Pool</div>
            <div className="pool-value">{totalPool} USDC</div>
          </div>
        </div>

        {/* NO Side */}
        <div className={`outcome-side no-side ${isResolved && Number(outcome) === 2 ? 'winner' : ''}`}>
          <div className="outcome-icon">
            <div className="icon-circle no-circle">
              {isResolved && Number(outcome) === 2 ? '🏆' : '❌'}
            </div>
          </div>
          <div className="outcome-label">NO</div>
          <div className="outcome-prob">{noProb}%</div>
          <div className="outcome-pool">{formatUnits(noBets, 6)} USDC</div>
        </div>
      </div>

      {/* Action Section */}
      {!isResolved && (
        <div className="action-section">
          {!showBetting ? (
            <button 
              className="place-bet-btn" 
              onClick={() => setShowBetting(true)}
            >
              <span className="btn-icon">💰</span>
              Place Your Bet
            </button>
          ) : (
            <div className="betting-interface">
              <div className="bet-input-group">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="Enter amount (USDC)"
                  className="bet-input"
                />
              </div>

              {showApproveButton ? (
                <button
                  disabled={isLoadingApprove || !writeApprove}
                  onClick={() => writeApprove?.()}
                  className="approve-btn-modern"
                >
                  {isLoadingApprove ? '⏳ Approving...' : `✓ Approve ${betAmount} USDC`}
                </button>
              ) : (
                <div className="bet-buttons-modern">
                  <button 
                    disabled={!writeYes || isLoadingYes || betAmountParsed === 0n} 
                    onClick={() => writeYes?.()} 
                    className="bet-btn yes-btn"
                  >
                    {isLoadingYes ? '⏳' : '✅'} Bet YES
                  </button>
                  <button 
                    disabled={!writeNo || isLoadingNo || betAmountParsed === 0n} 
                    onClick={() => writeNo?.()} 
                    className="bet-btn no-btn"
                  >
                    {isLoadingNo ? '⏳' : '❌'} Bet NO
                  </button>
                </div>
              )}
              
              <button 
                className="cancel-bet-btn" 
                onClick={() => setShowBetting(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Admin Controls */}
      {!isResolved && isArbitrator && (
        <div className="admin-section">
          <div className="admin-badge">⚙️ Arbitrator Controls</div>
          <div className="admin-buttons">
            <button 
              disabled={isLoadingResolveYes} 
              onClick={() => writeResolveYes?.()} 
              className="resolve-btn yes-resolve"
            >
              {isLoadingResolveYes ? '⏳ Resolving...' : '✅ Resolve YES'}
            </button>
            <button 
              disabled={isLoadingResolveNo} 
              onClick={() => writeResolveNo?.()} 
              className="resolve-btn no-resolve"
            >
              {isLoadingResolveNo ? '⏳ Resolving...' : '❌ Resolve NO'}
            </button>
          </div>
        </div>
      )}

      {/* Winner Section */}
      {isResolved && userWon && (
        <div className="winner-section">
          <div className="winner-badge">🎉 You Won!</div>
          <button 
            disabled={isLoadingWithdraw} 
            onClick={() => writeWithdraw?.()} 
            className="withdraw-btn"
          >
            {isLoadingWithdraw ? '⏳ Withdrawing...' : '💰 Claim Winnings'}
          </button>
        </div>
      )}

      {/* Success Messages */}
      {isSuccessApprove && <div className="toast-success">✓ Approval successful!</div>}
      {isSuccessYes && <div className="toast-success">✓ Bet on YES placed!</div>}
      {isSuccessNo && <div className="toast-success">✓ Bet on NO placed!</div>}
      {isSuccessResolveYes && <div className="toast-success">✓ Market resolved to YES!</div>}
      {isSuccessResolveNo && <div className="toast-success">✓ Market resolved to NO!</div>}
      {isSuccessWithdraw && <div className="toast-success">✓ Winnings claimed!</div>}
    </div>
  );
}

export default MarketCard;