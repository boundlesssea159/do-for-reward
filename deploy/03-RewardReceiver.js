const { networkConfig } = require("../config.helper.js");
const { network } = require("hardhat");
const { developmentChains } = require("../config.helper");

if (developmentChains.includes(network.name)) {
  module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const deployer = (await getNamedAccounts()).deployer;
    const mockV3AggregatorInfo = await deployments.get("MockV3Aggregator");
    const v3AggregatorAddress = mockV3AggregatorInfo.address;
    const mockRouterInfo = await deployments.get("MockCCIPRouter");
    const router = mockRouterInfo.address;
    await deploy("RewardReceiver", {
      from: deployer,
      log: true,
      args: [router, v3AggregatorAddress],
    });
  };

  module.exports.tags = ["all", "recevier"];
}
