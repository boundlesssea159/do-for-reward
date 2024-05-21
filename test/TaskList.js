const { assert, expect } = require("chai");
const { deployments, ethers } = require("hardhat");

function getTimestamp(year, month, day) {
  return new Date(year, month - 1, day).getTime();
}

describe("TaskList", () => {
  let task, singers, taskList;
  beforeEach(async () => {
    await deployments.fixture(["all"]);
    singers = await ethers.getSigners();
    task = {
      name: "Test Task",
      description: "A test task for the smart contract.",
      deadline: getTimestamp(2024, 5, 28), // 24 hours from now (in Unix timestamp)
      reward: "1000000000000000000", // 1 ETH in wei
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
      const taskWithOutName = {
        name: "",
        description: "A test task for the smart contract.",
        deadline: getTimestamp(2024, 5, 28), // 24 hours from now (in Unix timestamp)
        reward: "1000000000000000000", // 1 ETH in wei
      };
      await expect(taskList.addTask(taskWithOutName)).to.be.rejectedWith("TaskInvalid");
      // description is empty
      const taskWithOutDescription = {
        name: "task",
        description: "",
        deadline: getTimestamp(2024, 5, 28), // 24 hours from now (in Unix timestamp)
        reward: "1000000000000000000", // 1 ETH in wei
      };
      await expect(taskList.addTask(taskWithOutDescription)).to.be.rejectedWith("TaskInvalid");
      // deadline is in the past
      const taskWithInvalidDeadline = {
        name: "task",
        description: "description",
        deadline: getTimestamp(2024, 5, 21), // 24 hours from now (in Unix timestamp)
        reward: "1000000000000000000", // 1 ETH in wei
      };
      await expect(taskList.addTask(taskWithInvalidDeadline)).to.be.rejectedWith("TaskInvalid");
      // reward is no more than zero
      const taskWithInvalidReward = {
        name: "task",
        description: "description",
        deadline: getTimestamp(2024, 5, 21), // 24 hours from now (in Unix timestamp)
        reward: "0", // 1 ETH in wei
      };
      await expect(taskList.addTask(taskWithInvalidReward)).to.be.rejectedWith("TaskInvalid");
    });

    it("should revert if task isn't added  by deployer", async () => {
      const newTaskList = taskList.connect(singers[1]);
      await expect(newTaskList.addTask(task)).to.be.rejectedWith();
    });

    it("should fail to add the same task more than once", async () => {
      await taskList.addTask(task);
      await expect(taskList.addTask(task)).to.be.rejectedWith("TaskAlreadyExists");
    });
  });

  // todo if task is finished,tasks should clean it out
  // todo support anyone pick any task to complete
  // todo anyone can get reward when complete task
});
