const { deployments, getNamedAccounts, network, ethers } = require("hardhat");
const { networkConfig, developmentChains } = require("../../config.helper");
const { assert } = require("chai");

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const FUJI_RPC_URL = process.env.FUJI_RPC_URL;
const USER1_PRIVATE_KEY = process.env.USER1_PRIVATE_KEY;
const USER2_PRIVATE_KEY = process.env.USER2_PRIVATE_KEY;

developmentChains.includes(network.name)
  ? describe.skip
  : describe("tasks", () => {
      it("should transfer token from one chain to another chain when task is done", async () => {
        const { deploy } = deployments;
        const deployer = USER1_PRIVATE_KEY;
        const user1 = USER2_PRIVATE_KEY;
        // sepolia provider and singer
        const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
        const deployerSingerForSepolia = new ethers.Wallet(
          deployer,
          sepoliaProvider
        );
        const user1SingerForSepolia = new ethers.Wallet(user1, sepoliaProvider);
        // fuji provider and signer
        const fujiProvider = new ethers.JsonRpcProvider(FUJI_RPC_URL);
        const deployerSingerForFuji = new ethers.Wallet(deployer, fujiProvider);
        const user1SingerForFuji = new ethers.Wallet(user1, fujiProvider);
        // get balance of user1 on Sepolia
        const beforeBalance = await sepoliaProvider.getBalance(
          user1SingerForSepolia.address
        );
        console.log("user1 before balance:", beforeBalance);
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
        await deploy("Tasks", {
          from: deployerSingerForFuji.address,
          log: true,
          args: [
            networkConfig.fuji.router, // 0xF694E193200268f9a4868e4Aa017A0118C9a8177,0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846,0x5498BB86BC934c8D34FDA08E81D444153d0D06aD
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
          // ["math","homework",5,0]
          name: "math",
          description: "homework",
          reward: 5, // USD
          status: 0, // created
        });
        await addTaskResponse.wait(5);
        // deployer add receiver and selector to task contract
        const response = await tasks.addDestinationContractAndSelector(
          // 11155111,xx,16015286601757825753
          networkConfig.sepolia.chainId,
          receiverDeployInfo.address,
          "16015286601757825753" // to sepolia.  from seploia to fuji is 14767482510784806043
        );
        await response.wait(5);
        // user1 apply task
        const taskForUser = await tasks.connect(user1SingerForFuji);
        const [, indexs] = await taskForUser.showTasks();
        assert.equal(indexs.length, 1);
        const applyTaskResponse = await taskForUser.applyTask(
          networkConfig.sepolia.chainId,
          indexs[0]
        );
        await applyTaskResponse.wait(5);

        await new Promise(async (resolve, reject) => {
          // deployer mark the task done
          receiver.once("Received", async (to, tokenAmount) => {
            const markDoneResponse = await tasks.markDone(indexs[0]);
            await markDoneResponse.wait(6);
            // user1 balance should increase
            const afterBalance = await sepoliaProvider.getBalance(
              user1SingerForSepolia.address
            );
            console.log("user1 after balance:", afterBalance);
            assert.isAbove(afterBalance, beforeBalance);
            resolve();
          });
        })();
      });
    });
