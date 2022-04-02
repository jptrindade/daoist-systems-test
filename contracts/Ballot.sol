// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import "./gnosis-safe/GnosisSafe.sol";

/// @title A contract that allows voting on proposals based
//  on the amount staked on a given Balancer pool.
//  The proposals determine who can be a Owner of a Gnosis Safe
contract Ballot {
    // This represents the information of a vote.
    // It is accessed by a mapping that links the address
    // of the voter to this information.
    struct VoterInfo {
        uint256 weight; // weight is accumulated by the stake amount in a Balancer Pool
        uint256 vote; // index of the voted proposal
    }

    // This is a type for a single proposal.
    struct Proposal {
        string name; // short name (candidate pseudonym for example)
        address candidate; // address of the owner candidate
        bool willBeOwner; // remove from Owner list if false, add to Owner list if true
        uint256 voteCount; // number of accumulated votes
        bool executed; // check if the Proposal was already executed
    }

    address public balancerPool;

    address payable public gnosisSafe;

    // This declares a state variable that
    // stores a `Voter` struct for each possible address.
    mapping(address => VoterInfo) public voters;

    // A dynamically-sized array of `Proposal` structs.
    Proposal[] public proposals;

    /// Create a new ballot with weights derived from
    /// the amount of tokens staked in `_balancerPool`.
    /// @param _balancerPool Address of the Balancer Pool to check the weight of votes
    /// @param _gnosisSafe Address of the Gnosis Safe to add/remove Owners
    constructor(address _balancerPool, address payable _gnosisSafe) {
        balancerPool = _balancerPool;
        gnosisSafe = _gnosisSafe;
    }

    // Create a proposal to add or remove a Gnosis Safe owner
    function createProposal(
        string memory _name,
        address _candidate,
        bool _willBeOwner
    ) public {
        proposals.push(
            Proposal({
                name: _name,
                candidate: _candidate,
                willBeOwner: _willBeOwner,
                voteCount: 0,
                executed: false
            })
        );
    }

    function getWeight(address voter) public returns (uint256) {}

    /// Vote on a given proposal.
    function vote(uint256 proposalId) external {
        address sender = msg.sender;
        require(voters[sender].weight > 0, "Already voted");
        require(proposalId < proposals.length, "Invalid proposal");

        uint256 weight = getWeight(sender);
        require(weight > 0, "Has no right to vote");

        voters[sender].weight = weight;
        voters[sender].vote = proposalId;
        proposals[proposalId].voteCount += weight;
    }

    /// @dev Computes the winning proposal taking all
    /// previous votes into account and executes it.
    function determineAndExecuteWinningProposal() public {
        uint256 winningVoteCount = 0;
        uint256 winningProposal = 0;
        for (uint256 p = 0; p < proposals.length; p++) {
            if (
                proposals[p].voteCount > winningVoteCount &&
                !proposals[p].executed
            ) {
                winningVoteCount = proposals[p].voteCount;
                winningProposal = p;
            }
        }
        require(winningVoteCount > 0, "Winning proposal needs at least 1 vote");
        require(
            !proposals[winningProposal].executed,
            "Proposal already executed"
        );
        _executeProposal(winningProposal);
    }

    /// @dev Executes a proposal (only called by `executeWinningProposal`)
    function _executeProposal(uint256 proposalId) private {
        GnosisSafe _gnosisSafe = GnosisSafe(gnosisSafe);

        if (proposals[proposalId].willBeOwner) {
            _gnosisSafe.addOwnerWithThreshold(
                proposals[proposalId].candidate,
                _gnosisSafe.getThreshold()
            );
        } else {
            _gnosisSafe.removeOwner(
                address(this),
                proposals[proposalId].candidate,
                _gnosisSafe.getThreshold()
            );
        }
    }
}
