const { ethers } = require("hardhat");
const { networkConfig } = require("../../config.helper.js");
require("../../config.helper.js");

require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const deployer = (await getNamedAccounts()).deployer;

  const mockV3AggregatorInfo = await deployments.get("MockV3Aggregator");
  const taskList = await deploy("TaskList", {
    from: deployer,
    log: true,
    args: [
      networkConfig.sepolia.router,
      networkConfig.sepolia.link,
      // networkConfig.sepolia.priceFeed,
      mockV3AggregatorInfo.address
    ],
  });
  console.log("TaskList contract has deployed:", taskList.address);
};

module.exports.tags = ["all", "task"];
