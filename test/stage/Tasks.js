const { deployments, getNamedAccounts, network, ethers } = require("hardhat");
const { networkConfig, developmentChains } = require("../../config.helper");
const { task } = require("hardhat/config");
const { assert } = require("chai");

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const FUJI_RPC_URL = process.env.FUJI_RPC_URL;

// todo compiler version should be no more than 8.19
developmentChains.includes(network.name)
  ? describe.skip
  : describe("tasks", () => {
      it("should transfer token from one chain to another chain when task is done", async () => {
        const { deploy } = deployments;
        const { deployer, user1 } = await getNamedAccounts();
        ethers.provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
        const deployerSingerForSepolia = await ethers.getSigner(deployer);
        const user1SingerForSepolia = await ethers.getSigner(user1);
        // get balance of user1 on Sepolia
        const beforeBalance = await ethers.provider.getBalance(
          user1SingerForSepolia.address
        );
        // deployer deploy recevier contract on Sepolia
        await deploy("RewardReceiver", {
          from: deployerSingerForSepolia.address,
          log: true,
          args: [networkConfig.sepolia.router, networkConfig.sepolia.priceFeed],
        });
        const receiverDeployInfo = await deployments.get("RewardReceiver");
        const receiver = await ethers.getContractAt(
          receiverDeployInfo.abi,
          receiverDeployInfo.address,
          deployerSingerForSepolia
        );
        // deployer deploy tasks contract on FUJI
        ethers.provider = new ethers.JsonRpcProvider(FUJI_RPC_URL);
        const deployerSingerForFuji = await ethers.getSigner(deployer);
        const user1SingerForFuji = await ethers.getSigner(user1);
        await deploy("Tasks", {
          from: deployerSingerForFuji.address,
          log: true,
          args: [
            networkConfig.fuji.router,
            networkConfig.fuji.link,
            networkConfig.fuji.priceFeed,
          ],
        });
        // deployer add task
        const taskDeployInfo = await deployments.get("Tasks");
        const tasks = await ethers.getContractAt(
          taskDeployInfo.abi,
          taskDeployInfo.address,
          deployerSingerForFuji
        );
       
        const addTaskResponse = await tasks.addTask({
          name: "math",
          description: "homework",
          reward: 5, // USD
          status: 0, // created
        });
        await addTaskResponse.wait(6);
        // deployer add receiver and selector to task contract
        const response = await tasks.addDestinationContractAndSelector(
          networkConfig.sepolia.chainId,
          receiverDeployInfo.address,
          "16015286601757825753" // to sepolia.  from seploia to fuji is 14767482510784806043
        );
        await response.wait(6);
        // user1 apply task
        const taskForUser = await tasks.connect(user1SingerForFuji);
        const [, indexs] = await taskForUser.showTasks();
        assert.equal(indexs.length, 1);
        const applyTaskResponse = await taskForUser.applyTask(indexs[0]);
        await applyTaskResponse.wait(6);

        await new Promise(async (resolve, reject) => {
          // deployer mark the task done
          receiver.once("Received", async (to, tokenAmount) => {
            const markDoneResponse = await tasks.markDone(indexs[0]);
            await markDoneResponse.wait(6);
            // user1 balance should increase
            ethers.provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
            const afterBalance = await ethers.provider.getBalance(
              user1SingerForSepolia.address
            );
            assert.isAbove(afterBalance, beforeBalance);
            resolve();
          });
        })();
      });
    });
