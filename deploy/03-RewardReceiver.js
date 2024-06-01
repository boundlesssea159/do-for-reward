const { network } = require("hardhat");
const { developmentChains, networkConfig } = require("../config.helper.js");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  let router, priceFeed;
  if (developmentChains.includes(network.name)) {
    const mockRouterInfo = await deployments.get("MockCCIPRouter");
    router = mockRouterInfo.address;
    const mockV3AggregatorInfo = await deployments.get("MockV3Aggregator");
    priceFeed = mockV3AggregatorInfo.address;
  } else {
    router = networkConfig[network.name].router;
    priceFeed = networkConfig[network.name].priceFeed;
  }
  await deploy("RewardReceiver", {
    from: deployer,
    log: true,
    args: [router, priceFeed],
  });
};

module.exports.tags = ["all", "recevier"];
