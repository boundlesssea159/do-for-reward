// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

contract DataFeedAddress {
    mapping(uint256 => address) private dataFeedAddressOnTestnet;

    mapping(uint256 => address) private dataFeedAddressOnMainnet;

    constructor() {
        initDataFeedAddressOnTestnet();
    }

    function initDataFeedAddressOnTestnet() internal {
        dataFeedAddressOnTestnet[11155111] = address(
            0x694AA1769357215DE4FAC081bf1f309aDC325306
        );

    }

    function initDataFeedAddressOnMainnet() internal {
        dataFeedAddressOnTestnet[1] = address(
            0x694AA1769357215DE4FAC081bf1f309aDC325306
        );
        
    }

    function getDataFeedAddressOnTestnet(
        uint256 chainId
    ) external view returns (address) {}
}
