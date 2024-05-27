// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import {CCIPReceiver} from "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import "hardhat/console.sol";

contract RewardReceiver is CCIPReceiver {
    event Received(address to, uint256 amount);
    error ReceivedFailed(address to, uint256 amount);
    constructor(address _router) CCIPReceiver(_router) {}
    function _ccipReceive(
        Client.Any2EVMMessage memory message
    ) internal override {
        (address to, uint256 amount) = abi.decode(
            message.data,
            (address, uint256)
        );
        (bool success, ) = to.call{value: amount}("");
        if (!success) {
            console.log("recevied failed:", to, amount);
            revert ReceivedFailed(to, amount);
        }
        console.log("received:", to, amount);
        emit Received(to, amount);
    }
}
