// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@chainlink/contracts/src/v0.8/mocks/MockLinkToken.sol";

contract MockLinkTokenWrapped is MockLinkToken {
    function approve(address, uint256) public pure returns (bool) {
        return true;
    }
}
