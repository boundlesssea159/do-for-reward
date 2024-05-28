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
    const mockLinkTokenInfo = await deployments.get("MockLinkToken");
    const link = mockLinkTokenInfo.address;
    await deploy("TaskList", {
      from: deployer,
      log: true,
      args: [router, link, v3AggregatorAddress],
    });
  };
  module.exports.tags = ["all", "task"];
}
