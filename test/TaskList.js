const { assert, expect } = require("chai");
const { log } = require("console");
const { deployments, ethers } = require("hardhat");
const { describe } = require("node:test");

function getTimestamp(year, month, day) {
  return new Date(year, month - 1, day).getTime();
}

describe("TaskList", () => {
  let task, singers, taskList;
  beforeEach(async () => {
    await deployments.fixture(["all"]);
    singers = await ethers.getSigners();
    task = {
      name: "Task",
      description: "A task for unit test",
      deadline: getTimestamp(2024, 5, 28),
      reward: "1000000000000000000",
    };
    const deployInfo = await deployments.get("TaskList");
    taskList = await ethers.getContractAt(deployInfo.abi, deployInfo.address);
  });

  describe("add task", () => {
    it("should add task by deployer", async () => {
      await taskList.addTask(task);
      const size = await taskList.numOfTasks();
      assert.equal(size, 1);
    });

    it("should fail to add a task without neceesary information", async () => {
      // name is empty
      let taskWithOutName = task;
      taskWithOutName.name = "";
      await expect(taskList.addTask(taskWithOutName)).to.be.rejectedWith(
        "TaskInvalid"
      );
      // description is empty
      let taskWithOutDescription = task;
      taskWithOutDescription.describe = "";
      await expect(taskList.addTask(taskWithOutDescription)).to.be.rejectedWith(
        "TaskInvalid"
      );
      // deadline is in the past
      let taskWithInvalidDeadline = task;
      taskWithInvalidDeadline.deadline = getTimestamp(2024, 5, 21);
      await expect(
        taskList.addTask(taskWithInvalidDeadline)
      ).to.be.rejectedWith("TaskInvalid");
      // reward is no more than zero
      let taskWithInvalidReward = task;
      taskWithInvalidReward.reward = 0;
      await expect(taskList.addTask(taskWithInvalidReward)).to.be.rejectedWith(
        "TaskInvalid"
      );
    });

    it("should revert if task isn't added  by deployer", async () => {
      const newTaskList = taskList.connect(singers[1]);
      await expect(newTaskList.addTask(task)).to.be.rejectedWith();
    });

    it("should fail to add the same task more than once", async () => {
      await taskList.addTask(task);
      await expect(taskList.addTask(task)).to.be.rejectedWith(
        "TaskAlreadyExists"
      );
    });

    describe("show tasks", async () => {
      it("should show tasks", async () => {
        await taskList.addTask(task);
        let secondTask = task;
        secondTask.name = "second task";
        await taskList.addTask(secondTask);
        const tasks = await taskList.showTasks();
        assert.isAbove(tasks.length, 1);
      });
    });

    describe("get task", () => {
      it("should get task", async () => {
        await taskList.addTask(task);
        const success = await taskList.applyTask(0);
        console.log("success:", success);
        assert.equal(success, true);
      });
      it("should revert if task not exist", async () => {
        await expect(taskList.applyTask(0)).to.be.rejectedWith("TaskNotExist");
      });
    
      it("should revert if task has been got", async () => {
        await taskList.addTask(task);
        // first one gets task successfully
        const success = await taskList.applyTask(0);
        assert.equal(success, true);
        // seconde one gets task unsuccessfully
        await expect(taskList.applyTask(0)).to.be.rejectedWith("TaskHasBeenApplied");
      });
      

    });
  });

  // todo anyone can get reward when complete task
  // todo deployer can mark the task finished
  // todo if task is finished,tasks should clean it out
});
