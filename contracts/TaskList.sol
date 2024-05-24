// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "hardhat/console.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

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

    address private owner;

    task[] private tasks;

    uint256 public canBeAppliedNum;

    mapping(uint256 => applierInfomation) private taskToAccount;

    mapping(uint256 => address) private chainContractAddress;

    event TaskApplied(uint256 indexed index, address account);
    event TransferSuccess(address account, uint256 amount);

    error TaskInvalid();
    error TaskAlreadyExists(string name);
    error TaskNotExist(uint256 index);
    error TaskHasBeenApplied(uint256 index);

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner can call this function.");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addContractAddress(
        uint256 chainId,
        address contractAddress
    ) public onlyOwner{
        chainContractAddress[chainId] = contractAddress;
    }

    function hasContractAddressOfChain(
        uint256 chainId
    ) public view returns (bool) {
        return chainContractAddress[chainId] != address(0);
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
            (success, ) = address(applier.account).call{value: msg.value}("");
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
}
