// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "hardhat/console.sol";

error TaskInvalid();
error TaskAlreadyExists(string name);
error TaskNotExist(uint256 index);
error TaskHasBeenApplied(uint256 index);

contract TaskList {
    address private owner;

    task[] private tasks;

    enum Status {
        Created,
        Executing,
        Finished
    }

    event TaskApplied(uint256 indexed index);

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner can call this function.");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    struct task {
        string name;
        string description;
        uint256 deadline;
        uint256 reward; // USD
        Status status;
    }

    function addTask(task memory _task) public onlyOwner {
        console.log("_task:", _task.name);
        if (!isTaskValid(_task)) {
            revert TaskInvalid();
        }
        if (existTask(_task.name)) {
            revert TaskAlreadyExists(_task.name);
        }
        tasks.push(_task);
    }

    function isTaskValid(task memory _task) internal view returns (bool) {
        return
            bytes(_task.name).length > 0 &&
            bytes(_task.description).length > 0 &&
            _task.deadline > uint256(block.timestamp) * 1000 &&
            _task.reward > 0;
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

    function showTasks() public view returns (task[] memory) {
        return tasks;
    }

    function applyTask(uint256 index) public returns (bool) {
        if (index >= tasks.length) {
            revert TaskNotExist(index);
        }
        if (tasks[index].status != Status.Created) {
            revert TaskHasBeenApplied(index);
        }
        tasks[index].status = Status.Executing;
        emit TaskApplied(index);
    }
}
