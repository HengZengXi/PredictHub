// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.0/contracts/token/ERC20/IERC20.sol";

enum Outcome { Open, Yes, No }

// Struct to hold details of a single bet
struct Bet {
    address user;
    uint amount;
    uint reputationAtBet; // Store the user's reputation when they placed this bet
}

contract PredictionMarket {

    struct Market {
        uint id;
        string question;
        address arbitrator;
        uint resolutionDate;
        bool isResolved;
        uint yesBets; // Total amount bet (not weighted)
        uint noBets;  // Total amount bet (not weighted)
        Bet[] yesBetList; // Array to store all individual 'Yes' bets
        Bet[] noBetList;  // Array to store all individual 'No' bets
        Outcome outcome;
    }

    Market[] public markets;
    IERC20 public bettingToken;
    mapping(address => uint) public userReputation; // User address => reputation score

    constructor(address _tokenAddress) {
        bettingToken = IERC20(_tokenAddress);
    }

    function getMarketCount() public view returns (uint) {
        return markets.length;
    }

    // --- CORRECTED HELPER FUNCTION ---
    function getUserBet(uint _marketId, address _user) public view returns(uint yesBetTotal, uint noBetTotal) {
        require(_marketId < markets.length, "Market does not exist.");
        Market storage market = markets[_marketId];
        
        uint totalYes = 0;
        for (uint i = 0; i < market.yesBetList.length; i++) {
            if (market.yesBetList[i].user == _user) {
                totalYes += market.yesBetList[i].amount;
            }
        }

        uint totalNo = 0;
        for (uint i = 0; i < market.noBetList.length; i++) {
            if (market.noBetList[i].user == _user) {
                totalNo += market.noBetList[i].amount;
            }
        }

        return (totalYes, totalNo);
    }
    // --- NEW: Calculate total weighted 'Yes' value ---
    function getTotalWeightedYes(uint _marketId) public view returns (uint weightedTotal) {
        require(_marketId < markets.length, "Market does not exist.");
        Market storage market = markets[_marketId];
        weightedTotal = 0;
        for (uint i = 0; i < market.yesBetList.length; i++) {
            // Weighted value = amount * reputation when the bet was placed
            weightedTotal += market.yesBetList[i].amount * market.yesBetList[i].reputationAtBet;
        }
        return weightedTotal;
    }

    // --- NEW: Calculate total weighted 'No' value ---
    function getTotalWeightedNo(uint _marketId) public view returns (uint weightedTotal) {
        require(_marketId < markets.length, "Market does not exist.");
        Market storage market = markets[_marketId];
        weightedTotal = 0;
        for (uint i = 0; i < market.noBetList.length; i++) {
            weightedTotal += market.noBetList[i].amount * market.noBetList[i].reputationAtBet;
        }
        return weightedTotal;
    }


    function createMarket(string memory _question, address _arbitrator, uint _resolutionDate) public {
        Market storage newMarket = markets.push();
        newMarket.id = markets.length - 1;
        newMarket.question = _question;
        newMarket.arbitrator = _arbitrator;
        newMarket.resolutionDate = _resolutionDate;
    }

    function placeBet(uint _marketId, bool _outcome, uint _amount) public {
        require(_marketId < markets.length, "Market does not exist.");
        require(!markets[_marketId].isResolved, "Market is already resolved.");
        require(_amount > 0, "Bet amount must be greater than zero.");

        Market storage market = markets[_marketId];
        
        bool success = bettingToken.transferFrom(msg.sender, address(this), _amount);
        require(success, "Token transfer failed. Did you approve?");

        uint currentReputation = userReputation[msg.sender];
        if (currentReputation == 0) {
            currentReputation = 100; // Default starting score
            userReputation[msg.sender] = currentReputation;
        }

        Bet memory newBet = Bet({
            user: msg.sender,
            amount: _amount,
            reputationAtBet: currentReputation
        });

        if (_outcome == true) {
            market.yesBetList.push(newBet);
            market.yesBets += _amount;
        } else {
            market.noBetList.push(newBet);
            market.noBets += _amount;
        }
    }

    function resolveMarket(uint _marketId, bool _winningOutcome) public {
        Market storage market = markets[_marketId];

        // Security checks (unchanged)
        require(msg.sender == market.arbitrator, "Only the arbitrator can resolve.");
        require(!market.isResolved, "Market is already resolved.");

        // Set outcome (unchanged)
        market.isResolved = true;
        if (_winningOutcome == true) {
            market.outcome = Outcome.Yes;
        } else {
            market.outcome = Outcome.No;
        }

        // --- NEW: Update Reputations ---
        uint reputationGain = 5; // Points gained for winning
        uint reputationLoss = 2; // Points lost for losing (ensure it doesn't go below zero)

        if (market.outcome == Outcome.Yes) {
            // Yes bettors won
            for (uint i = 0; i < market.yesBetList.length; i++) {
                address winner = market.yesBetList[i].user;
                userReputation[winner] += reputationGain;
            }
            // No bettors lost
            for (uint i = 0; i < market.noBetList.length; i++) {
                address loser = market.noBetList[i].user;
                if (userReputation[loser] >= reputationLoss) {
                    userReputation[loser] -= reputationLoss;
                } else {
                    userReputation[loser] = 0; // Prevent reputation going negative
                }
            }
        } else { // market.outcome == Outcome.No
            // No bettors won
            for (uint i = 0; i < market.noBetList.length; i++) {
                address winner = market.noBetList[i].user;
                userReputation[winner] += reputationGain;
            }
            // Yes bettors lost
            for (uint i = 0; i < market.yesBetList.length; i++) {
                address loser = market.yesBetList[i].user;
                if (userReputation[loser] >= reputationLoss) {
                    userReputation[loser] -= reputationLoss;
                } else {
                    userReputation[loser] = 0;
                }
            }
        }
    }

  function withdraw(uint _marketId) public {
    Market storage market = markets[_marketId];
    require(market.isResolved, "Market is not yet resolved.");
    
    uint totalUserBet = 0;
    uint totalWinningBets = 0;
    uint totalLosingBets = 0;
    
    // Calculate user's total bet amount
    if (market.outcome == Outcome.Yes) {
        // User bet on YES (winning side)
        for (uint i = 0; i < market.yesBetList.length; i++) {
            if (market.yesBetList[i].user == msg.sender && market.yesBetList[i].amount > 0) {
                totalUserBet += market.yesBetList[i].amount;
                market.yesBetList[i].amount = 0; // Mark as withdrawn
            }
        }
        totalWinningBets = market.yesBets;
        totalLosingBets = market.noBets;
    } else if (market.outcome == Outcome.No) {
        // User bet on NO (winning side)
        for (uint i = 0; i < market.noBetList.length; i++) {
            if (market.noBetList[i].user == msg.sender && market.noBetList[i].amount > 0) {
                totalUserBet += market.noBetList[i].amount;
                market.noBetList[i].amount = 0; // Mark as withdrawn
            }
        }
        totalWinningBets = market.noBets;
        totalLosingBets = market.yesBets;
    } else {
        revert("Market outcome is not decided.");
    }
    
    require(totalUserBet > 0, "You have no winnings to withdraw or already withdrew.");
    
    // Calculate winnings: (user's bet / total winning bets) * total pool
    uint totalPool = market.yesBets + market.noBets;
    uint winnings = (totalUserBet * totalPool) / totalWinningBets;
    
    bool success = bettingToken.transfer(msg.sender, winnings);
    require(success, "Token withdrawal failed.");
}
}
