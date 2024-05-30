// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {IERC20} from "@chainlink/contracts-ccip/src/v0.8/vendor/openzeppelin-solidity/v4.8.3/contracts/token/ERC20/IERC20.sol";
import {PriceConverter} from "./PriceConverter.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract Tasks {
    using PriceConverter for uint256;

    enum Status {
        Created,
        Executing,
        Finished
    }

    struct task {
        string name;
        string description;
        uint256 reward; // USD
        Status status;
    }

    struct applierInfomation {
        address account;
        uint256 chainId;
    }

    struct chainContractAndSelector {
        address contractAddress;
        uint64 selector;
    }

    event TaskCreated(uint256 indexed index);
    event TaskApplied(uint256 indexed index, address account);
    event TransferSuccess(address account, uint256 amount);
    event MessageSent(bytes32 messageId);

    error TaskInvalid();
    error TaskAlreadyExists(string name);
    error TaskNotExist(uint256 index);
    error TaskHasBeenApplied(uint256 index);
    error NotEnoughBalance(uint256 currentBalance, uint256 calculatedFees);

    address public owner;

    task[] private tasks;

    uint256 public canBeAppliedNum;

    LinkTokenInterface private linkToken;

    IRouterClient private router;

    AggregatorV3Interface private priceFeed;

    mapping(uint256 => applierInfomation) private taskToAccount;
    mapping(uint256 => chainContractAndSelector)
        private chainToContractAndSelector;

    constructor(address _router, address _link, address _priceFeed) {
        owner = msg.sender;
        router = IRouterClient(_router);
        linkToken = LinkTokenInterface(_link);
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner can call this function.");
        _;
    }

    receive() external payable {}

    function addDestinationContractAndSelector(
        uint256 chainId,
        address contractAddress,
        uint64 selector
    ) public onlyOwner {
        chainToContractAndSelector[chainId] = chainContractAndSelector(
            contractAddress,
            selector
        );
    }

    function hasContractAddressOfChain(
        uint256 chainId
    ) public view returns (bool) {
        return
            chainToContractAndSelector[chainId].contractAddress != address(0);
    }

    function hasSelectorOfChain(
        uint256 chainId
    ) public view onlyOwner returns (bool) {
        return chainToContractAndSelector[chainId].selector > 0;
    }

    function addTask(task memory _task) public onlyOwner {
        if (!isTaskValid(_task)) {
            revert TaskInvalid();
        }
        tasks.push(_task);
        canBeAppliedNum++;
        emit TaskCreated(tasks.length - 1);
    }

    function isTaskValid(task memory _task) internal pure returns (bool) {
        return
            bytes(_task.name).length > 0 &&
            bytes(_task.description).length > 0 &&
            _task.reward > 0 &&
            _task.status == Status.Created;
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

    function applyTask(uint256 chainId, uint256 index) public {
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
            tasks[index].status == Status.Executing,
            "task status should be executing"
        );
        applierInfomation memory applier = taskToAccount[index];
        if (applier.chainId == block.chainid) {
            sendRewardOnLocalChain(applier.account, index);
        } else {
            sendRewardByCCIP(applier.chainId, applier.account, index);
        }
    }

    function sendRewardOnLocalChain(address account, uint256 index) internal {
        uint256 amount = tasks[index].reward * 1e18;
        require(
            address(this).balance.getConversionRate(priceFeed) >= amount,
            "need more balance"
        );
        uint256 v = amount.getTokenAmountByUSD(priceFeed);
        (bool success, ) = address(account).call{value: v}("");
        if (success) {
            emit TransferSuccess(account, v);
            cleanTask(index);
        }
    }

    function sendRewardByCCIP(
        uint256 chainId,
        address account,
        uint256 index
    ) internal {
        Client.EVM2AnyMessage memory message = buildCCIPMsg(
            chainId,
            account,
            index
        );
        balanceShouldMoreThanFee(chainId, message);
        bytes32 messageId = router.ccipSend(
            chainToContractAndSelector[chainId].selector,
            message
        );
        emit MessageSent(messageId);
        cleanTask(index);
    }

    function buildCCIPMsg(
        uint256 chainId,
        address account,
        uint256 taskIndex
    ) internal view returns (Client.EVM2AnyMessage memory) {
        return
            Client.EVM2AnyMessage({
                receiver: abi.encode(
                    chainToContractAndSelector[chainId].contractAddress
                ),
                data: abi.encode(account, tasks[taskIndex].reward * 1e18),
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
        uint256 fees = router.getFee(
            chainToContractAndSelector[chainId].selector,
            message
        );
        if (fees > linkToken.balanceOf(address(this)))
            revert NotEnoughBalance(linkToken.balanceOf(address(this)), fees);
    }

    function cleanTask(uint256 taskIndex) internal {
        tasks[taskIndex].status = Status.Finished;
        delete taskToAccount[taskIndex];
    }

    function withdrawLINK() public onlyOwner {
        uint256 amount = linkToken.balanceOf(address(this));
        require(amount > 0, "no balance to withdraw");
        linkToken.transfer(owner, amount);
    }

    function withdraw() public onlyOwner {
        (bool success,) = payable(owner).call{value: address(this).balance}("");
        require(success,"withdraw fail");
    }
}
