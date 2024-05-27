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

    error TaskInvalid();
    error TaskAlreadyExists(string name);
    error TaskNotExist(uint256 index);
    error TaskHasBeenApplied(uint256 index);
    error NotEnoughBalance(uint256 currentBalance, uint256 calculatedFees);

    address private owner;

    task[] private tasks;

    uint256 public canBeAppliedNum;

    LinkTokenInterface private linkToken;

    mapping(uint256 => applierInfomation) private taskToAccount;
    mapping(uint256 => address) private destinationContractAddress;
    mapping(uint256 => uint64) private destinationSelector;
    IRouterClient private router;

    constructor(address _router, address _link) {
        owner = msg.sender;
        router = IRouterClient(_router);
        linkToken = LinkTokenInterface(_link);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner can call this function.");
        _;
    }

    receive() external payable {}

    function addDestinationContractAddress(
        uint256 chainId,
        address contractAddress
    ) public onlyOwner {
        destinationContractAddress[chainId] = contractAddress;
    }

    function hasContractAddressOfChain(
        uint256 chainId
    ) public view returns (bool) {
        return destinationContractAddress[chainId] != address(0);
    }

    function addDestinationSelector(
        uint256 chainId,
        uint64 selector
    ) public onlyOwner {
        destinationSelector[chainId] = selector;
    }

    function hasSelectorOfChain(
        uint256 chainId
    ) public view onlyOwner returns (bool) {
        return destinationSelector[chainId] > 0;
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
        console.log("balance:", address(this).balance);
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
        if (applier.chainId == block.chainid) {
            sendReward(applier.account, index);
        } else {
            sendRewardByCCIP(applier.chainId, index);
        }
    }

    function sendReward(address account, uint256 index) internal {
        (bool success, ) = address(account).call{value: tasks[index].reward}(
            ""
        );
        if (success) {
            emit TransferSuccess(account, msg.value);
            cleanTask(index);
        }
        console.log("transfer result:", success, tasks[index].reward);
    }

    function sendRewardByCCIP(uint256 chainId, uint256 index) internal {
        Client.EVM2AnyMessage memory message = buildCCIPMsg(chainId, index);
        balanceShouldMoreThanFee(chainId, message);
        bytes32 messageId = router.ccipSend(
            destinationSelector[chainId],
            message
        );
        emit MessageSent(messageId);
        cleanTask(index);
        console.log("ccip sent");
    }

    function buildCCIPMsg(
        uint256 chainId,
        uint256 taskIndex
    ) internal view returns (Client.EVM2AnyMessage memory) {
        return
            Client.EVM2AnyMessage({
                receiver: abi.encode(destinationContractAddress[chainId]),
                data: abi.encode(msg.sender, tasks[taskIndex].reward),
                tokenAmounts: new Client.EVMTokenAmount[](0),
                extraArgs: Client._argsToBytes(
                    Client.EVMExtraArgsV1({gasLimit: 980_000})
                ),
                feeToken: address(linkToken)
            });
    }

    function balanceShouldMoreThanFee(
        uint256 chainId,
        Client.EVM2AnyMessage memory message
    ) internal view {
        uint256 fees = router.getFee(destinationSelector[chainId], message);
        if (fees > linkToken.balanceOf(address(this)))
            revert NotEnoughBalance(linkToken.balanceOf(address(this)), fees);
    }

    function cleanTask(uint256 taskIndex) internal {
        tasks[taskIndex].status = Status.Finished;
        delete taskToAccount[taskIndex];
    }
}
