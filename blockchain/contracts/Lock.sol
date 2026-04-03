// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// Unlock time is in the future
error InvalidUnlockTime(uint256 unlockTime, uint256 currentTime);
// Caller is not the owner
error NotOwner(address caller, address owner);
// Unlock time has not passed yet
error UnlockTimeNotReached(uint256 unlockTime, uint256 currentTime);

contract Lock {
    uint256 public unlockTime;
    address payable public owner;

    event Withdrawal(uint256 amount, uint256 when);

    constructor(uint256 _unlockTime) payable {
        if (block.timestamp >= _unlockTime) {
            revert InvalidUnlockTime(_unlockTime, block.timestamp);
        }

        unlockTime = _unlockTime;
        owner = payable(msg.sender);
    }

    function withdraw() public {
        if (block.timestamp < unlockTime) {
            revert UnlockTimeNotReached(unlockTime, block.timestamp);
        }

        if (msg.sender != owner) {
            revert NotOwner(msg.sender, owner);
        }

        emit Withdrawal(address(this).balance, block.timestamp);

        owner.transfer(address(this).balance);
    }
}
