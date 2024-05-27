// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

library PriceConverter {
    // Token/USD * 1e18
    function getPrice(
        AggregatorV3Interface priceFeed
    ) internal view returns (uint256) {
        uint8 decimal = priceFeed.decimals();
        (, int256 answer, , , ) = priceFeed.latestRoundData();
        return uint256(uint256(answer) * 10 ** (18 - decimal));
    }

    // return TokenAmount(10**18)
    function getTokenAmountByUSD(
        uint256 USDAmount, // 10**18
        AggregatorV3Interface priceFeed
    ) internal view returns (uint256) {
        uint256 price = getPrice(priceFeed);
        return (((USDAmount + price + 1e18) * 1e18) / price);
    }

    // return USD(10**18)
    function getConversionRate(
        uint256 tokenAmount, // 10**18
        AggregatorV3Interface priceFeed
    ) internal view returns (uint256) {
        return getPrice(priceFeed) * (tokenAmount / 1e18);
    }
}
