const { assert, expect } = require("chai");
const { log } = require("console");
const { deployments, ethers } = require("hardhat");
const { describe } = require("node:test");

function getTimestamp(year, month, day) {
  return new Date(year, month - 1, day).getTime();
}

describe("TaskList", () => {
  let task, singers, taskList, chainId;
  beforeEach(async () => {
    await deployments.fixture(["all"]);
    singers = await ethers.getSigners();
    task = {
      name: "Task",
      description: "A task for unit test",
      deadline: getTimestamp(2024, 5, 28).toString(),
      reward: ethers.parseEther("0.01"), // ETH wei
      status: 0,
    };
    const deployInfo = await deployments.get("TaskList");
    taskList = await ethers.getContractAt(deployInfo.abi, deployInfo.address);
    chainId = 31337;
  });

  describe("add task", () => {
    it("should add task by deployer", async () => {
      const addTaskResponse = await taskList.addTask(task);
      await addTaskResponse.wait(1);
      const size = await taskList.numOfTasks();
      assert.equal(size, 1);
    });

    it("should fail to add a task without neceesary information", async () => {
      // name is empty
      let taskWithOutName = { ...task };
      taskWithOutName.name = "";
      await expect(taskList.addTask(taskWithOutName)).to.be.rejectedWith(
        "TaskInvalid"
      );
      // description is empty
      let taskWithOutDescription = { ...task };
      taskWithOutDescription.description = "";
      await expect(taskList.addTask(taskWithOutDescription)).to.be.rejectedWith(
        "TaskInvalid"
      );
      // deadline is in the past
      let taskWithInvalidDeadline = { ...task };
      taskWithInvalidDeadline.deadline = getTimestamp(2024, 5, 21);
      await expect(
        taskList.addTask(taskWithInvalidDeadline)
      ).to.be.rejectedWith("TaskInvalid");
      // reward is no more than zero
      let taskWithInvalidReward = { ...task };
      taskWithInvalidReward.reward = 0;
      await expect(taskList.addTask(taskWithInvalidReward)).to.be.rejectedWith(
        "TaskInvalid"
      );
      // status is not created
      let taskWithNonCreatedStatus = { ...task };
      taskWithNonCreatedStatus.status = 1;
      await expect(
        taskList.addTask(taskWithNonCreatedStatus)
      ).to.be.rejectedWith("TaskInvalid");
    });

    it("should revert if task isn't added  by deployer", async () => {
      const newTaskList = taskList.connect(singers[1]);
      await expect(newTaskList.addTask(task)).to.be.rejectedWith();
    });

    it("should fail to add the same task more than once", async () => {
      const addTaskResponse = await taskList.addTask(task);
      await addTaskResponse.wait(1);
      await expect(taskList.addTask(task)).to.be.rejectedWith(
        "TaskAlreadyExists"
      );
    });

    describe("show tasks", async () => {
      it("should show tasks with created status", async () => {
        const addTaskResponse = await taskList.addTask(task);
        await addTaskResponse.wait(1);
        const [, indexs] = await taskList.showTasks();
        assert.equal(indexs.length, 1);
        assert.equal(indexs[0], 0);
        // add task with non created status
        const taskWithNonCreatedStatus = task;
        taskWithNonCreatedStatus.name = "second task";
        const addAnotherTaskResponse = await taskList.addTask(
          taskWithNonCreatedStatus
        );
        await addAnotherTaskResponse.wait(1);
        const response = await taskList.applyTask(indexs[0], chainId);
        response.wait(1);
        const [, newIndexs] = await taskList.showTasks();
        assert.equal(newIndexs.length, 1);
        assert.equal(newIndexs[0], 1);
      });
    });

    describe("apply task", () => {
      it("should apply task", async () => {
        const addTaskResponse = await taskList.addTask(task);
        await addTaskResponse.wait(1);
        const response = await taskList.applyTask(0, chainId);
        await response.wait(1);
        expect(response).to.emit(taskList, "TaskApplied");
      });
      it("should revert if task not exist", async () => {
        await expect(taskList.applyTask(0, chainId)).to.be.rejectedWith(
          "TaskNotExist"
        );
      });

      it("should revert if task has been applied", async () => {
        const addTaskResponse = await taskList.addTask(task);
        await addTaskResponse.wait(1);
        // first one gets task successfully
        const response = await taskList.applyTask(0, chainId);
        await response.wait(1);
        expect(response).to.emit(taskList, "TaskApplied");
        // seconde one gets task unsuccessfully
        await expect(taskList.applyTask(0, chainId)).to.be.rejectedWith(
          "TaskHasBeenApplied"
        );
      });
    });
  });

  describe("mark done", async () => {
    beforeEach(async () => {
      const deployer = singers[0];
      const tx = await deployer.sendTransaction({
        to: taskList.target,
        value: ethers.parseEther("2.0"),
      });
      await tx.wait();
    });

    it("should revert if sender is not deployer", async () => {
      const addTaskResponse = await taskList.addTask(task);
      await addTaskResponse.wait(1);
      const newTaskList = taskList.connect(singers[1]);
      await expect(newTaskList.markDone(0)).to.be.rejectedWith();
    });

    it("should revert if task is not exist", async () => {
      await expect(taskList.markDone(0)).to.be.rejectedWith("TaskNotExist");
    });

    it("should revert if task status is not execute", async () => {
      const addTaskResponse = await taskList.addTask(task);
      await addTaskResponse.wait(1);
      const [, indexs] = await taskList.showTasks();
      await expect(taskList.markDone(indexs[0])).to.be.revertedWith(
        "task doesn't execute"
      );
      const applyResonse = await taskList.applyTask(indexs[0], chainId);
      await applyResonse.wait(1);
      const response = await taskList.markDone(indexs[0]);
      await response.wait(1);
      await expect(taskList.markDone(indexs[0])).to.be.revertedWith(
        "task doesn't execute"
      );
    });

    it("should transfer token to someone when task is finished", async () => {
      // deployer add task
      const addTaskResponse = await taskList.addTask(task);
      await addTaskResponse.wait(1);
      const [, indexs] = await taskList.showTasks();
      assert.equal(indexs.length, 1);
      // someone else apply it
      const applier = singers[1];
      const beforeBalance = await ethers.provider.getBalance(applier.address);
      console.log("before balance:", beforeBalance);
      const taskForApplying = taskList.connect(applier);
      const applyResonse = await taskForApplying.applyTask(indexs[0], chainId);
      await applyResonse.wait(1);
      // deployer transfer token to the one who apply and finish the task.
      const taskForMarkingDone = taskList.connect(singers[0]);
      const markDoneResponse = await taskForMarkingDone.markDone(indexs[0]);
      await markDoneResponse.wait(1);
      // assert someone account balance has increased
      const afterBalance = await ethers.provider.getBalance(applier.address);
      assert.isAbove(afterBalance, beforeBalance);
      await expect(markDoneResponse).to.emit(
        taskForMarkingDone,
        "TransferSuccess"
      );
      const [, newIndexs] = await taskList.showTasks();
      assert.equal(newIndexs.length, 0);
      console.log("after balance:", afterBalance);
    });
  });

  describe("add destination contract address", () => {
    let rewardReceiverInfo;
    beforeEach(async () => {
      rewardReceiverInfo = await deployments.get("RewardReceiver");
    });
    it("should add destination contract address", async () => {
      const addChainContractAdrressResponse =
        await taskList.addDestinationContractAddress(
          chainId,
          rewardReceiverInfo.address
        );
      await addChainContractAdrressResponse.wait(1);
      const exist = await taskList.hasContractAddressOfChain(chainId);
      assert.equal(exist, true);
    });
    it("should only be called by deployer", async () => {
      const newTaskList = taskList.connect(singers[1]);
      await expect(
        newTaskList.addDestinationContractAddress(
          chainId,
          rewardReceiverInfo.address
        )
      ).to.be.rejectedWith();
    });
  });

  describe("add destination chain selector", () => {
    it("should add destination chain selector", async () => {
      const addDestinationSelectorResponse =
        await taskList.addDestinationSelector(chainId, "14767482510784806043");
      await addDestinationSelectorResponse.wait(1);
      const exist = await taskList.hasSelectorOfChain(chainId);
      assert.equal(exist, true);
    });

    it("should only be called by deployer on addDestinationSelector", async () => {
      const newTaskList = taskList.connect(singers[1]);
      await expect(
        newTaskList.addDestinationSelector(chainId, "14767482510784806043")
      ).to.be.rejectedWith();
    });
  });
});
