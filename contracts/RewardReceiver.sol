// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import {CCIPReceiver} from "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import {PriceConverter} from "./PriceConverter.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract RewardReceiver is CCIPReceiver {
    using PriceConverter for uint256;

    AggregatorV3Interface private priceFeed;

    event Received(address to, uint256 amount);
    error ReceivedFailed(address to, uint256 amount);

    constructor(
        address _router,
        address _priceFeed
    ) CCIPReceiver(_router) {
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    function _ccipReceive(
        Client.Any2EVMMessage memory message
    ) internal override {
        (address to, uint256 amount) = abi.decode(
            message.data,
            (address, uint256)
        );
        // amount is USD * 1e18
        balanceShouldMoreThanAmount(amount);
        uint256 tokenAmount = amount.getTokenAmountByUSD(priceFeed);
        (bool success, ) = to.call{value: tokenAmount}("");
        if (!success) {
            revert ReceivedFailed(to, tokenAmount);
        }
        emit Received(to, tokenAmount);
    }

    function balanceShouldMoreThanAmount(uint256 amount) internal view {
        require(
            address(this).balance.getConversionRate(priceFeed) >= amount,
            "need more balance"
        );
    }
}
