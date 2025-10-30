import './App.css';
import MarketCard from './components/MarketCard';
import CreateMarket from './components/CreateMarket';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useContractRead, useContractReads } from 'wagmi';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { contractAddress, contractABI } from './constants';
import { useState } from 'react';

function App() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect({ connector: new InjectedConnector() });
  const { disconnect } = useDisconnect();

  // Pagination state
  const [openMarketsPage, setOpenMarketsPage] = useState(1);
  const [closedMarketsPage, setClosedMarketsPage] = useState(1);
  const MARKETS_PER_PAGE = 6;

  const { data: marketCountData } = useContractRead({
    address: contractAddress,
    abi: contractABI,
    functionName: 'getMarketCount',
    watch: true,
  });

  const marketCount = marketCountData ? Number(marketCountData) : 0;

  // Set up reads
  const marketReads = [];
  for (let i = 0; i < marketCount; i++) {
    marketReads.push({ address: contractAddress, abi: contractABI, functionName: 'markets', args: [i] });
    marketReads.push({ address: contractAddress, abi: contractABI, functionName: 'getTotalWeightedYes', args: [i] });
    marketReads.push({ address: contractAddress, abi: contractABI, functionName: 'getTotalWeightedNo', args: [i] });
  }

  // Fetch all data
  const { data: marketBatchData, isLoading } = useContractReads({
    contracts: marketReads,
    watch: true,
    cacheTime: 5_000,
    staleTime: 2_000,
  });

  // Process data
  const processedMarkets = [];
  if (marketBatchData) {
    for (let i = 0; i < marketCount * 3; i += 3) {
      const marketDataResult = marketBatchData[i]?.result;
      const weightedYesResult = typeof marketBatchData[i + 1]?.result === 'bigint' ? marketBatchData[i + 1].result : 0n;
      const weightedNoResult = typeof marketBatchData[i + 2]?.result === 'bigint' ? marketBatchData[i + 2].result : 0n;

      if (marketDataResult) {
        processedMarkets.push({
          id: marketDataResult[0],
          question: marketDataResult[1],
          arbitrator: marketDataResult[2],
          date: new Date(Number(marketDataResult[3]) * 1000).toLocaleDateString(),
          yesBets: marketDataResult[5],
          noBets: marketDataResult[6],
          outcome: marketDataResult[7],
          weightedYes: weightedYesResult,
          weightedNo: weightedNoResult,
        });
      }
    }
  }

  // Filter lists
  const openMarkets = processedMarkets.filter(m => Number(m.outcome) === 0);
  const closedMarkets = processedMarkets.filter(m => Number(m.outcome) === 1 || Number(m.outcome) === 2);

  // Pagination logic
  const paginateMarkets = (markets, page) => {
    const startIndex = (page - 1) * MARKETS_PER_PAGE;
    const endIndex = startIndex + MARKETS_PER_PAGE;
    return markets.slice(startIndex, endIndex);
  };

  const getTotalPages = (markets) => Math.ceil(markets.length / MARKETS_PER_PAGE);

  // Wallet button with modern styling
  const renderWalletButton = () => {
    if (isConnected) {
      return (
        <div className="wallet-connected">
          <div className="wallet-address">
            <span className="wallet-icon">🔗</span>
            <span className="address-text">
              {address?.substring(0, 6)}...{address?.substring(address.length - 4)}
            </span>
          </div>
          <button className="disconnect-btn" onClick={() => disconnect()}>
            Disconnect
          </button>
        </div>
      );
    } else {
      return (
        <button className="connect-wallet-btn" onClick={() => connect()}>
          <span className="wallet-icon">🦊</span>
          Connect Wallet
        </button>
      );
    }
  };

  // Market list renderer with pagination
  const renderMarketList = (markets, currentPage, setPage) => {
    const totalPages = getTotalPages(markets);
    const paginatedMarkets = paginateMarkets(markets, currentPage);

    if (!markets || markets.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <p>No markets in this category.</p>
        </div>
      );
    }

    return (
      <>
        <div className="markets-grid">
          {paginatedMarkets.map((market) => (
            <MarketCard
              key={market.id}
              id={market.id}
              question={market.question}
              arbitrator={market.arbitrator}
              date={market.date}
              yesBets={market.yesBets}
              noBets={market.noBets}
              outcome={market.outcome}
              userAddress={address}
              weightedYes={market.weightedYes}
              weightedNo={market.weightedNo}
            />
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="pagination-controls">
            <button 
              className="pagination-btn"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              ← Previous
            </button>
            
            <div className="pagination-info">
              <span className="page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    className={`page-number ${currentPage === pageNum ? 'active' : ''}`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
              </span>
              <span className="page-text">
                Page {currentPage} of {totalPages} ({markets.length} total)
              </span>
            </div>

            <button 
              className="pagination-btn"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </>
    );
  };

  // Main render with modern layout
  return (
    <div className="app-container">
      {/* Animated background elements */}
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-orb orb-3"></div>

      {/* Navbar with Navigation Menu */}
      <nav className="navbar">
        <div className="navbar-content">
          <div className="logo">
            <span className="logo-icon">🎯</span>
            <span className="logo-text">PredictHub</span>
          </div>

          <div className="nav-menu">
            <a href="#home" className="nav-link">
              <span className="nav-icon">🏠</span>
              <span>Home</span>
            </a>
            <a href="#create" className="nav-link">
              <span className="nav-icon">✨</span>
              <span>Create Market</span>
            </a>
            <a href="#active" className="nav-link">
              <span className="nav-icon">🔥</span>
              <span>Active Markets</span>
            </a>
            <a href="#resolved" className="nav-link">
              <span className="nav-icon">✅</span>
              <span>Resolved Markets</span>
            </a>
          </div>

          {renderWalletButton()}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="gradient-text">Predict the Future.</span>
            <br />
            <span className="gradient-text-alt">Win Big.</span>
          </h1>
          <p className="hero-subtitle">
            The most advanced decentralized prediction market on the blockchain.
            Create markets, place bets, and earn rewards.
          </p>
          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-value">{marketCount}</div>
              <div className="stat-label">Total Markets</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{openMarkets.length}</div>
              <div className="stat-label">Active Markets</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{closedMarkets.length}</div>
              <div className="stat-label">Resolved</div>
            </div>
          </div>
        </div>
      </section>

      {/* Create Market Section */}
      <section className="create-market-section">
        <div className="section-header">
          <h2 className="section-title">
            <span className="title-icon">✨</span>
            Create New Market
          </h2>
          <p className="section-subtitle">
            Launch your own prediction market and let the crowd decide
          </p>
        </div>
        <CreateMarket />
      </section>

      {/* Open Markets Section */}
      <section className="markets-section">
        <div className="section-header">
          <h2 className="section-title">
            <span className="title-icon">🔥</span>
            Active Markets
          </h2>
          <p className="section-subtitle">
            {openMarkets.length} markets open for betting
          </p>
        </div>
        {isLoading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="loading-text">Loading markets from blockchain...</p>
          </div>
        ) : (
          renderMarketList(openMarkets, openMarketsPage, setOpenMarketsPage)
        )}
      </section>

      {/* Closed Markets Section */}
      <section className="markets-section">
        <div className="section-header">
          <h2 className="section-title">
            <span className="title-icon">✅</span>
            Resolved Markets
          </h2>
          <p className="section-subtitle">
            {closedMarkets.length} markets have been resolved
          </p>
        </div>
        {isLoading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="loading-text">Loading markets from blockchain...</p>
          </div>
        ) : (
          renderMarketList(closedMarkets, closedMarketsPage, setClosedMarketsPage)
        )}
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-logo">
            <span className="logo-icon">🎯</span>
            <span className="logo-text">PredictHub</span>
          </div>
          <p className="footer-text">
            Decentralized prediction markets powered by blockchain technology
          </p>
          <div className="footer-links">
            <a href="#about" className="footer-link">About</a>
            <a href="#how-it-works" className="footer-link">How It Works</a>
            <a href="#faq" className="footer-link">FAQ</a>
            <a href="#contact" className="footer-link">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;