# Daoism Systems Test

I would like to start by thanking Kat, Arseny, Konstantin and the entire Daoism Systems team for this opportunity.

The challenge was left incomplete, I couldn't properly figure out how to get the Balancer Pools working and interacting with the Ballot contract, this is due to my inexperience and lack of knowledge on Solidity developemnt so I understand if this answer is not satisfactory to Daoism Systems. Either way I would like to give a quick rundown on my solution as well as possible problems it addresses/creates and other things to note.

The Ballot contract is initiated with 3 variables:

- The address of the Gnosis Safe to add/remove Owners
- The address of the Balancer Pool to check the weight of each voter
- The timeframe between each execution of the winning proposal

I wanted to make an "automatic" system where each winning proposal would be executed when the timeframe has elapsed. Unfortunately, there is no concept of sleep/timeout on Solidity (which makes sense) so I made sure to time lock the function to execute the winning proposal and make it available to the public. My thought process being that there could be a system off chain that executes the proposal when it is due or that a interested party would manually run this function when the timeframe has passed (for example, if the winning proposal was to add me as an owner, if no system to execute the function automatically existed, I would run the function myself).

The voting problem was a bit interesting, in the beggining I did not know how to manage the votes, I had a mapping that linked the address to the vote given and a user would only have one vote. I found this to be too limiting, and this would quickly skew the system because the only people available to vote on new proposals would be those that did not previously vote, meaning that people that invested for longer and interacted with the system would have no voting power on the new proposals.

I then concluded that we needed a way to "refresh" the vote of a person, my first idea was to delete every proposal after a winning proposal was chosen, refreshing the system, creating a new ballot with new proposals but Konstantin suggested that I should keep the other proposals. I thought about whiping the votes of each proposal after the winning proposal was chosen but that did not feel right as well, so I decided to keep the votes of the previous proposals while giving the voters another chance to vote after a proposal was chosen. In essence, each address has one vote per timeframe.

I decided to let anyone submit a proposal, but that would prove troublesome since any bad actor could just spam the ballot with not so good proposals. I believe there could be (at least) two solutions to this problem:

- Only allow people with a significant share of the Balancer Pool to create proposals (maybe limiting the proposals created to 1 per timeframe as well)
- Create a list of trusted people that can create proposals (as a simple example, it could be equal to the Gnosis Safe owners)

Finally, there is the question of the weight of each vote, I think just checking the amount staked (assuming it is not locked) in a Balancer Pool to be flawed. This is because a bad actor can do the following:

- 1. Create a wallet and add funds
- 2. Stake in the Balancer Pool
- 3. Vote on the Ballot
- 4. Unstake
- 5. Create a new wallet and transfer the funds to it
- Repeat 2~5

This would result in someone having unlimited votes, only being limited by gas fees. This problem could be solved by only allowing addresses that are staking for X amount of time if X is greater than the voting timeframe.
