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
      deadline: getTimestamp(2024, 5, 28).toString(),
      reward: "100",
      status: 0,
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
      let taskWithOutName = {...task};
      taskWithOutName.name = "";
      await expect(taskList.addTask(taskWithOutName)).to.be.rejectedWith(
        "TaskInvalid"
      );
      // description is empty
      let taskWithOutDescription = {...task};
      taskWithOutDescription.description = "";
      await expect(taskList.addTask(taskWithOutDescription)).to.be.rejectedWith(
        "TaskInvalid"
      );
      // deadline is in the past
      let taskWithInvalidDeadline = {...task};
      taskWithInvalidDeadline.deadline = getTimestamp(2024, 5, 21);
      await expect(
        taskList.addTask(taskWithInvalidDeadline)
      ).to.be.rejectedWith("TaskInvalid");
      // reward is no more than zero
      let taskWithInvalidReward = {...task};
      taskWithInvalidReward.reward = 0;
      await expect(taskList.addTask(taskWithInvalidReward)).to.be.rejectedWith(
        "TaskInvalid"
      );
      // status is not created
      let taskWithNonCreatedStatus = {...task};
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
      await taskList.addTask(task);
      await expect(taskList.addTask(task)).to.be.rejectedWith(
        "TaskAlreadyExists"
      );
    });

    describe("show tasks", async () => {
      it("should show tasks with created status", async () => {
        await taskList.addTask(task);
        const [, indexs] = await taskList.showTasks();
        assert.equal(indexs.length, 1);
        assert.equal(indexs[0], 0);
        // add task with non created status
        const taskWithNonCreatedStatus = task;
        taskWithNonCreatedStatus.name = "second task";
        await taskList.addTask(taskWithNonCreatedStatus);
        const response = await taskList.applyTask(indexs[0]);
        response.wait(1);
        const [, newIndexs] = await taskList.showTasks();
        assert.equal(newIndexs.length, 1);
        assert.equal(newIndexs[0], 1);
      });
    });

    describe("apply task", () => {
      it("should apply task", async () => {
        await taskList.addTask(task);
        const response = await taskList.applyTask(0);
        await response.wait(1);
        expect(response).to.emit(taskList, "TaskApplied");
      });
      it("should revert if task not exist", async () => {
        await expect(taskList.applyTask(0)).to.be.rejectedWith("TaskNotExist");
      });

      it("should revert if task has been applied", async () => {
        await taskList.addTask(task);
        // first one gets task successfully
        const response = await taskList.applyTask(0);
        await response.wait(1);
        expect(response).to.emit(taskList, "TaskApplied");
        // seconde one gets task unsuccessfully
        await expect(taskList.applyTask(0)).to.be.rejectedWith(
          "TaskHasBeenApplied"
        );
      });
    });
  });

  describe("finishTask", async () => {
    
  });
  // todo anyone can get reward when complete task
  // todo deployer can mark the task finished
  // todo if task is finished,tasks should clean it out
});
