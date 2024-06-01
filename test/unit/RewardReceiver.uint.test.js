const { assert, expect } = require("chai");
const { log } = require("console");
const { deployments, ethers, network } = require("hardhat");
const { describe } = require("node:test");
const { developmentChains } = require("../../config.helper.js");
const { ECDH } = require("crypto");

describe("RewardReceiver", () => {
  it("should be successful", async () => {
    await deployments.fixture(["all"]);
    const deployInfo = await deployments.get("RewardReceiver");
    const receiver = await ethers.getContractAt(
      deployInfo.abi,
      deployInfo.address
    );
    const signers = await ethers.getSigners();
    const sendTransactionToTaskResponse = await signers[0].sendTransaction({
      to: deployInfo.address,
      value: ethers.parseEther("1"),
    });
    await sendTransactionToTaskResponse.wait(1);

    const response = await receiver.receivForTest();
    await response.wait(1);
    expect(response).to.emit(receiver, "Received");
  });
});
