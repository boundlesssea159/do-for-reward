const { networkConfig } = require("../../config.helper.js");

require("hardhat");
require("../../config.helper.js");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const deployer = (await getNamedAccounts()).deployer;
  const rewardRecevier = await deploy("RewardReceiver", {
    from: deployer,
    log: true,
    args: [networkConfig.fuji.router],
  });
  console.log("RewardReceiver contract has deployed:", rewardRecevier.address);
};

module.exports.tags = ["all", "recevier"];
