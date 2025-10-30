import React, { useState } from 'react';
import './CreateMarket.css';
import { useContractWrite, usePrepareContractWrite } from 'wagmi';
import { contractAddress, contractABI } from '../constants';

function CreateMarket() {
  const [question, setQuestion] = useState('');
  const [arbitrator, setArbitrator] = useState('');
  const [date, setDate] = useState('');

  // Convert the HTML date string to a Unix timestamp for Solidity
  const resolutionTimestamp = Math.floor(new Date(date).getTime() / 1000);

  // Prepare the smart contract call
  const { config } = usePrepareContractWrite({
    address: contractAddress,
    abi: contractABI,
    functionName: 'createMarket',
    args: [question, arbitrator, resolutionTimestamp],
    enabled: Boolean(question && arbitrator && date),
  });

  // Get the functions and state for the transaction
  const { data, isLoading, isSuccess, write, isError, error } = useContractWrite(config);

  // This function is called when the form is submitted
  const handleSubmit = (e) => {
    e.preventDefault();
    if (write) {
      write();
    }
  };

  return (
    <div className="create-market-card">
      <form className="create-market-form-modern" onSubmit={handleSubmit}>
       
        {/* Question Field */}
        <div className="form-field">
          <label className="field-label">
            <span className="field-icon">❓</span>
            Market Question
          </label>
          <input
            type="text"
            className="form-input-modern"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Will Bitcoin reach $100k by end of 2025?"
            required
          />
        </div>

        {/* Arbitrator Field */}
        <div className="form-field">
          <label className="field-label">
            <span className="field-icon">⚖️</span>
            Arbitrator Address
          </label>
          <input
            type="text"
            className="form-input-modern"
            value={arbitrator}
            onChange={(e) => setArbitrator(e.target.value)}
            placeholder="0x..."
            required
          />
          <div className="field-hint">
            The wallet address that will resolve this market
          </div>
        </div>

        {/* Resolution Date Field */}
        <div className="form-field">
          <label className="field-label">
            <span className="field-icon">📅</span>
            Resolution Date
          </label>
          <div className="date-input-wrapper">
            <input
              type="date"
              className="form-input-modern date-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="field-hint">
            When this market can be resolved
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="create-market-btn"
          disabled={!write || isLoading}
        >
          {isLoading ? (
            <>
              <span className="btn-spinner">⏳</span>
              Creating Market...
            </>
          ) : (
            <>
              <span className="btn-icon">🚀</span>
              Create Market
            </>
          )}
        </button>

        {/* Success Message */}
        {isSuccess && (
          <div className="status-message success-message-modern">
            <div className="message-icon">✅</div>
            <div className="message-content">
              <div className="message-title">Market Created Successfully!</div>
              <a
                href={`https://sepolia.etherscan.io/tx/${data?.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="etherscan-link"
              >
                <span className="link-icon">🔗</span>
                View on Etherscan
              </a>
            </div>
          </div>
        )}

        {/* Error Message */}
        {isError && (
          <div className="status-message error-message-modern">
            <div className="message-icon">⚠️</div>
            <div className="message-content">
              <div className="message-title">Transaction Failed</div>
              <div className="message-text">{error?.shortMessage}</div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

export default CreateMarket;