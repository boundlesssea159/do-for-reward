const { assert, expect } = require("chai");
const { log } = require("console");
const { deployments, ethers, network } = require("hardhat");
const { describe } = require("node:test");
const { developmentChains } = require("../../config.helper.js");
function getTimestamp() {
  var date = new Date();
  var newDate = date.setDate(date.getDate() + 10);
  var time = new Date(newDate).getTime();
  console.log("time:", time);
  return time;
}

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Tasks", () => {
      let task, singers, tasks, chainId;
      beforeEach(async () => {
        await deployments.fixture(["all"]);
        singers = await ethers.getSigners();
        task = {
          name: "math",
          description: "homework",
          reward: 5,
          status: 0,
        };
        const deployInfo = await deployments.get("Tasks");
        tasks = await ethers.getContractAt(deployInfo.abi, deployInfo.address);
        chainId = 31337;
      });

      describe("add task", () => {
        it("should add task by deployer", async () => {
          const addTaskResponse = await tasks.addTask(task);
          await addTaskResponse.wait(1);
          const size = await tasks.numOfTasks();
          assert.equal(size, 1);
        });

        it("should fail to add a task without neceesary information", async () => {
          // name is empty
          let taskWithOutName = { ...task };
          taskWithOutName.name = "";
          await expect(tasks.addTask(taskWithOutName)).to.be.rejectedWith(
            "TaskInvalid"
          );
          // description is empty
          let taskWithOutDescription = { ...task };
          taskWithOutDescription.description = "";
          await expect(
            tasks.addTask(taskWithOutDescription)
          ).to.be.rejectedWith("TaskInvalid");
          // reward is no more than zero
          let taskWithInvalidReward = { ...task };
          taskWithInvalidReward.reward = 0;
          await expect(tasks.addTask(taskWithInvalidReward)).to.be.rejectedWith(
            "TaskInvalid"
          );
          // status is not created
          let taskWithNonCreatedStatus = { ...task };
          taskWithNonCreatedStatus.status = 1;
          await expect(
            tasks.addTask(taskWithNonCreatedStatus)
          ).to.be.rejectedWith("TaskInvalid");
        });

        it("should revert if task isn't added  by deployer", async () => {
          const newTaskList = tasks.connect(singers[1]);
          await expect(newTaskList.addTask(task)).to.be.rejectedWith();
        });

        it("should fail to add the same task more than once", async () => {
          const addTaskResponse = await tasks.addTask(task);
          await addTaskResponse.wait(1);
          await expect(tasks.addTask(task)).to.be.rejectedWith(
            "TaskAlreadyExists"
          );
        });

        describe("show tasks", async () => {
          it("should show tasks with created status", async () => {
            const addTaskResponse = await tasks.addTask(task);
            await addTaskResponse.wait(1);
            const [, indexs] = await tasks.showTasks();
            assert.equal(indexs.length, 1);
            assert.equal(indexs[0], 0);
            // add task with non created status
            const taskWithNonCreatedStatus = task;
            taskWithNonCreatedStatus.name = "second task";
            const addAnotherTaskResponse = await tasks.addTask(
              taskWithNonCreatedStatus
            );
            await addAnotherTaskResponse.wait(1);
            const response = await tasks.applyTask(chainId,indexs[0]);
            response.wait(1);
            const [, newIndexs] = await tasks.showTasks();
            assert.equal(newIndexs.length, 1);
            assert.equal(newIndexs[0], 1);
          });
        });

        describe("apply task", () => {
          it("should apply task", async () => {
            const addTaskResponse = await tasks.addTask(task);
            await addTaskResponse.wait(1);
            const response = await tasks.applyTask(chainId,0);
            await response.wait(1);
            expect(response).to.emit(tasks, "TaskApplied");
          });
          it("should revert if task not exist", async () => {
            await expect(tasks.applyTask(chainId,0)).to.be.rejectedWith(
              "TaskNotExist"
            );
          });

          it("should revert if task has been applied", async () => {
            const addTaskResponse = await tasks.addTask(task);
            await addTaskResponse.wait(1);
            // first one gets task successfully
            const response = await tasks.applyTask( chainId,0);
            await response.wait(1);
            expect(response).to.emit(tasks, "TaskApplied");
            // seconde one gets task unsuccessfully
            await expect(tasks.applyTask(chainId,0)).to.be.rejectedWith(
              "TaskHasBeenApplied"
            );
          });
        });
      });

      describe("mark done", async () => {
        beforeEach(async () => {
          const deployer = singers[0];
          const tx = await deployer.sendTransaction({
            to: tasks.target,
            value: ethers.parseEther("2.0"),
          });
          await tx.wait();
        });

        it("should revert if sender is not deployer", async () => {
          const addTaskResponse = await tasks.addTask(task);
          await addTaskResponse.wait(1);
          const newTaskList = tasks.connect(singers[1]);
          await expect(newTaskList.markDone(0)).to.be.rejectedWith();
        });

        it("should revert if task is not exist", async () => {
          await expect(tasks.markDone(0)).to.be.rejectedWith("TaskNotExist");
        });

        it("should revert if task status is not execute", async () => {
          const addTaskResponse = await tasks.addTask(task);
          await addTaskResponse.wait(1);
          const [, indexs] = await tasks.showTasks();
          await expect(tasks.markDone(indexs[0])).to.be.revertedWith(
           "task status should be executing"
          );
          const applyResonse = await tasks.applyTask(chainId,indexs[0]);
          await applyResonse.wait(1);
          const response = await tasks.markDone(indexs[0]);
          await response.wait(1);
          await expect(tasks.markDone(indexs[0])).to.be.revertedWith(
            "task status should be executing"
          );
        });

        it("should transfer token to someone when task is finished", async () => {
          // deployer add task
          const addTaskResponse = await tasks.addTask(task);
          await addTaskResponse.wait(1);
          const [, indexs] = await tasks.showTasks();
          assert.equal(indexs.length, 1);
          // someone else apply it
          const applier = singers[1];
          const beforeBalance = await ethers.provider.getBalance(
            applier.address
          );
          console.log("before balance:", beforeBalance);
          const taskForApplying = tasks.connect(applier);
          const applyResonse = await taskForApplying.applyTask(
            chainId,
            indexs[0]
          );
          await applyResonse.wait(1);
          // deployer transfer token to the one who apply and finish the task.
          const taskForMarkingDone = tasks.connect(singers[0]);
          const markDoneResponse = await taskForMarkingDone.markDone(indexs[0]);
          await markDoneResponse.wait(1);
          // assert someone account balance has increased
          const afterBalance = await ethers.provider.getBalance(
            applier.address
          );
          assert.isAbove(afterBalance, beforeBalance);
          await expect(markDoneResponse).to.emit(
            taskForMarkingDone,
            "TransferSuccess"
          );
          const [, newIndexs] = await tasks.showTasks();
          assert.equal(newIndexs.length, 0);
          console.log("after balance:", afterBalance);
        });
      });

      describe("add destination contract and selector", () => {
        let rewardReceiverInfo;
        beforeEach(async () => {
          rewardReceiverInfo = await deployments.get("RewardReceiver");
        });

        it("should add destination contract and selector", async () => {
          const response = await tasks.addDestinationContractAndSelector(
            chainId,
            rewardReceiverInfo.address,
            "14767482510784806043"
          );
          await response.wait(1);
          assert.equal(await tasks.hasContractAddressOfChain(chainId), true);
          assert.equal(await tasks.hasSelectorOfChain(chainId), true);
        });

        it("should only be called by deployer", async () => {
          const newTaskList = tasks.connect(singers[1]);
          await expect(
            newTaskList.addDestinationContractAndSelector(
              chainId,
              rewardReceiverInfo.address,
              "14767482510784806043"
            )
          ).to.be.rejectedWith();
        });
      });
    });
