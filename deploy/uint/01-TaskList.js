const { ethers } = require("hardhat");
const { networkConfig } = require("../../config.helper.js");
require("../../config.helper.js");

require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const deployer = (await getNamedAccounts()).deployer;
  const taskList = await deploy("TaskList", {
    from: deployer,
    log: true,
    args: [networkConfig.sepolia.router],
  });
  console.log("TaskList contract has deployed:", taskList.address);
};

module.exports.tags = ["all", "task"];
