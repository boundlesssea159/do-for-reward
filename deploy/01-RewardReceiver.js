const { networkConfig } = require("../config.helper.js");
const { network } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const deployer = (await getNamedAccounts()).deployer;
  let v3AggregatorAddress, router;
  if (network.name == "hardhat") {
    const mockV3AggregatorInfo = await deployments.get("MockV3Aggregator");
    v3AggregatorAddress = mockV3AggregatorInfo.address;
    const mockRouterInfo = await deployments.get("MockCCIPRouter");
    router = mockRouterInfo.address;
  } else {
    v3AggregatorAddress = networkConfig.fuji.priceFeed;
    router = networkConfig.fuji.router;
  }
  await deploy("RewardReceiver", {
    from: deployer,
    log: true,
    args: [router, v3AggregatorAddress],
  });
};

module.exports.tags = ["all", "recevier"];
