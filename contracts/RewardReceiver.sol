// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import {CCIPReceiver} from "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import {PriceConverter} from "./PriceConverter.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract RewardReceiver is CCIPReceiver {
    using PriceConverter for uint256;

    AggregatorV3Interface private priceFeed;
    address public owner;

    event Received(address to, uint256 amount);

    error ReceivedFailed(address to, uint256 amount);

    constructor(address _router, address _priceFeed) CCIPReceiver(_router) {
        priceFeed = AggregatorV3Interface(_priceFeed);
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner can call this function.");
        _;
    }

    function _ccipReceive(
        Client.Any2EVMMessage memory message
    ) internal override {
        (address to, uint256 amount) = abi.decode(
            message.data,
            (address, uint256)
        );
        // amount is USD * 1e18
        uint256 tokenAmount = amount.getTokenAmountByUSD(priceFeed);
        (bool success, ) = to.call{value: tokenAmount}("");
        if (!success) {
            revert ReceivedFailed(to, tokenAmount);
        }
        emit Received(to, tokenAmount);
    }

    function withdraw() public onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    receive() external payable {}

    function receivForTest() public onlyOwner {
        Client.Any2EVMMessage memory message = Client.Any2EVMMessage({
            messageId: 0x0000000000000000000000000000000000000000000000000000000000000000,
            sourceChainSelector: 0,
            sender: abi.encode(address(this)),
            data: abi.encode(address(this), 100 * 1e18),
            destTokenAmounts: new Client.EVMTokenAmount[](0)
        });
        _ccipReceive(message);
    }
}
