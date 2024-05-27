// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {IERC20} from "@chainlink/contracts-ccip/src/v0.8/vendor/openzeppelin-solidity/v4.8.3/contracts/token/ERC20/IERC20.sol";

contract TaskList {
    enum Status {
        Created,
        Executing,
        Finished
    }

    struct task {
        string name;
        string description;
        uint256 deadline;
        uint256 reward; // USD
        Status status;
    }

    struct applierInfomation {
        address account;
        uint256 chainId;
    }

    event TaskApplied(uint256 indexed index, address account);
    event TransferSuccess(address account, uint256 amount);
    event MessageSent(bytes32 messageId);
    event TokensTransferred(
        bytes32 indexed messageId, // The unique ID of the message.
        uint64 indexed destinationChainSelector, // The chain selector of the destination chain.
        address receiver, // The address of the receiver on the destination chain.
        address token, // The token address that was transferred.
        uint256 tokenAmount, // The token amount that was transferred.
        address feeToken, // the token address used to pay CCIP fees.
        uint256 fees // The fees paid for sending the message.
    );

    error TaskInvalid();
    error TaskAlreadyExists(string name);
    error TaskNotExist(uint256 index);
    error TaskHasBeenApplied(uint256 index);
    error NotEnoughBalance(uint256 currentBalance, uint256 calculatedFees);
    error DestinationChainNotAllowlisted(uint64 destinationChainSelector);

    address private owner;

    task[] private tasks;

    uint256 public canBeAppliedNum;

    mapping(uint256 => applierInfomation) private taskToAccount;
    mapping(uint256 => address) private chainContractAddress;
    mapping(uint64 => bool) public allowlistedChains;

    IRouterClient private router;

    constructor(address _router) {
        owner = msg.sender;
        router = IRouterClient(_router);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner can call this function.");
        _;
    }

    modifier onlyAllowlistedChain(uint64 _destinationChainSelector) {
        if (!allowlistedChains[_destinationChainSelector])
            revert DestinationChainNotAllowlisted(_destinationChainSelector);
        _;
    }

    function addContractAddress(
        uint256 chainId,
        address contractAddress
    ) public onlyOwner {
        chainContractAddress[chainId] = contractAddress;
    }

    function hasContractAddressOfChain(
        uint256 chainId
    ) public view returns (bool) {
        return chainContractAddress[chainId] != address(0);
    }

    function allowlistDestinationChain(
        uint64 _destinationChainSelector,
        bool allowed
    ) external onlyOwner {
        allowlistedChains[_destinationChainSelector] = allowed;
    }

    function addTask(task memory _task) public onlyOwner {
        if (!isTaskValid(_task)) {
            revert TaskInvalid();
        }
        if (existTask(_task.name)) {
            revert TaskAlreadyExists(_task.name);
        }
        tasks.push(_task);
        canBeAppliedNum++;
    }

    function isTaskValid(task memory _task) internal view returns (bool) {
        return
            bytes(_task.name).length > 0 &&
            bytes(_task.description).length > 0 &&
            _task.deadline > uint256(block.timestamp) * 1000 &&
            _task.reward > 0 &&
            _task.status == Status.Created;
    }

    function existTask(string memory name) internal view returns (bool) {
        for (uint256 i = 0; i < tasks.length; i++) {
            if (
                keccak256(abi.encodePacked(tasks[i].name)) ==
                keccak256(abi.encodePacked(name))
            ) {
                return true;
            }
        }
        return false;
    }

    function numOfTasks() public view returns (uint256) {
        return tasks.length;
    }

    function showTasks() public view returns (task[] memory, uint256[] memory) {
        task[] memory showAbleTasks = new task[](canBeAppliedNum);
        uint256[] memory indexs = new uint256[](canBeAppliedNum);
        uint256 index = 0;
        for (uint256 i = 0; i < tasks.length; i++) {
            if (tasks[i].status == Status.Created) {
                showAbleTasks[index] = tasks[i];
                indexs[index] = i;
                index++;
            }
        }
        return (showAbleTasks, indexs);
    }

    function applyTask(uint256 index, uint256 chainId) public {
        taskShouldBeExist(index);
        if (tasks[index].status != Status.Created) {
            revert TaskHasBeenApplied(index);
        }
        tasks[index].status = Status.Executing;
        canBeAppliedNum--;
        taskToAccount[index] = applierInfomation(msg.sender, chainId);
        emit TaskApplied(index, msg.sender);
    }

    function taskShouldBeExist(uint256 index) internal view {
        if (index >= tasks.length) {
            revert TaskNotExist(index);
        }
    }

    function markDone(uint256 index) public payable onlyOwner {
        console.log("balance:",address(this).balance);
        taskShouldBeExist(index);
        require(
            tasks[index].status != Status.Created &&
                tasks[index].status != Status.Finished,
            "task doesn't execute"
        );
        applierInfomation memory applier = taskToAccount[index];
        // transfert to same link
        console.log("chain id:", block.chainid);
        console.log("destination chain id:", applier.chainId);
        bool success;
        if (applier.chainId == block.chainid) {
            (success, ) = address(applier.account).call{value: tasks[index].reward}("");
            console.log("transfer result1:", success, tasks[index].reward);
        } else {
            // todo transfer to another link account
            // 1. constructor recevie another contract address
            // 2. call the ccip function to transfer amount to another contract
            // 3. another contract will receive the amount and transfer to the person who finish the task(note: another contract should have enough amount balance)
        }
        if (success) {
            emit TransferSuccess(applier.account, msg.value);
            tasks[index].status = Status.Finished;
            delete taskToAccount[index];
        }
    }

    receive() external payable {}

    // function reward(
    //     uint64 _destinationChainSelector,
    //     address _receiver, // can be account?
    //     address _token,
    //     uint256 _amount // xx
    // )
    //     external
    //     onlyAllowlistedChain(_destinationChainSelector)
    //     onlyOwner
    //     returns (bytes32 messageId)
    // {
    //     // Create an EVM2AnyMessage struct in memory with necessary information for sending a cross-chain message
    //     // address(0) means fees are paid in native gas
    //     Client.EVM2AnyMessage memory evm2AnyMessage = _buildCCIPMessage(
    //         _receiver,
    //         _token,
    //         _amount,
    //         address(0)
    //     );

    //     // Get the fee required to send the message
    //     uint256 fees = router.getFee(_destinationChainSelector, evm2AnyMessage);

    //     if (fees > address(this).balance)
    //         revert NotEnoughBalance(address(this).balance, fees);

    //     // approve the Router to spend tokens on contract's behalf. It will spend the amount of the given token
    //     IERC20(_token).approve(address(router), _amount);

    //     // Send the message through the router and store the returned message ID
    //     messageId = router.ccipSend{value: fees}(
    //         _destinationChainSelector,
    //         evm2AnyMessage
    //     );

    //     // Emit an event with message details
    //     emit TokensTransferred(
    //         messageId,
    //         _destinationChainSelector,
    //         _receiver,
    //         _token,
    //         _amount,
    //         address(0),
    //         fees
    //     );

    //     // Return the message ID
    //     return messageId;
    // }

    // function _buildCCIPMessage(
    //     address _receiver,
    //     address _token,
    //     uint256 _amount,
    //     address _feeTokenAddress
    // ) private pure returns (Client.EVM2AnyMessage memory) {
    //     // Set the token amounts
    //     Client.EVMTokenAmount[]
    //         memory tokenAmounts = new Client.EVMTokenAmount[](1);
    //     tokenAmounts[0] = Client.EVMTokenAmount({
    //         token: _token,
    //         amount: _amount
    //     });

    //     // Create an EVM2AnyMessage struct in memory with necessary information for sending a cross-chain message
    //     return
    //         Client.EVM2AnyMessage({
    //             receiver: abi.encode(_receiver), // ABI-encoded receiver address
    //             data: "", // No data
    //             tokenAmounts: tokenAmounts, // The amount and type of token being transferred
    //             extraArgs: Client._argsToBytes(
    //                 // Additional arguments, setting gas limit to 0 as we are not sending any data
    //                 Client.EVMExtraArgsV1({gasLimit: 0})
    //             ),
    //             // Set the feeToken to a feeTokenAddress, indicating specific asset will be used for fees
    //             feeToken: _feeTokenAddress
    //         });
    // }
}
