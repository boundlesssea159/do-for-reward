const { deployments, getNamedAccounts, network, ethers } = require("hardhat");
const { networkConfig, developmentChains } = require("../../config.helper");
const { task } = require("hardhat/config");
const { assert } = require("chai");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("tasks", () => {
      it("should transfer token from one chain to another chain when task is done", async () => {
        // user1  deploy recevier contract on FUJI (cost AVAX)
        const { deploy } = deployments;
        const { deployer, user1 } = await getNamedAccounts();
        const deployerSinger = await ethers.getSigner(deployer);
        const user1Singer = await ethers.getSigner(user1);
        await deploy("RewardReceiver", {
          from: deployerSinger.address,
          log: true,
          args: [networkConfig.fuji.router, networkConfig.fuji.priceFeed],
        });
        const beforeBalance = await ethers.provider.getBalance(user1);
        // deployer deploy task contract on ETH (cost ETH)
        await deploy("Tasks", {
          from: deployerSinger.address,
          log: true,
          args: [
            networkConfig.sepolia.router,
            networkConfig.sepolia.link,
            networkConfig.sepolia.priceFeed,
          ],
        });
        // deployer add task to task contract(cost ETH)
        const taskDeployInfo = await deployments.get("Tasks");
        const tasks = await ethers.getContractAt(
          taskDeployInfo.abi,
          taskDeployInfo.address,
          deployerSinger
        );
        await taskTx.wait(1);
        const addTaskResponse = await tasks.addTask({
          name: "Do It",
          description: "homework",
          reward: 5, // USD
          status: 0, // created
        });
        await addTaskResponse.wait(1);
        // deployer add receiver and selector to task contract (cost ETH)
        const receiverDeployInfo = await deployments.get("RewardReceiver");
        const response = await tasks.addDestinationContractAndSelector(
          networkConfig.fuji.chainId,
          receiverDeployInfo.address,
          "14767482510784806043"
        );
        await response.wait(1);
        // user1 apply task (cost ETH)
        const taskForUser = await tasks.connect(user1Singer);
        const [, indexs] = await tasks.showTasks();
        assert.equal(indexs.length, 1);
        const applyTaskResponse = await taskForUser.applyTask(indexs[0]);
        await applyTaskResponse.wait(1);
        // deployer mark the task done (cost ETH,LINK and AVAX)
        const markDoneResponse = await tasks.markDone(indexs[1]);
        await markDoneResponse.wait(1);

        // user1's account balance should increase
        // todo listen the Received event
        const afterBalance = await ethers.provider.getBalance(user1);
        assert.isAbove(afterBalance, beforeBalance);
      });
    });
