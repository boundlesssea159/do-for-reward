const { network } = require("hardhat");
const { developmentChains, networkConfig } = require("../config.helper.js");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const deployer = (await getNamedAccounts()).deployer;

  let router, price;
  if (developmentChains.includes(network.name)) {
    const mockV3AggregatorInfo = await deployments.get("MockV3Aggregator");
    price = mockV3AggregatorInfo.address;
    const mockRouterInfo = await deployments.get("MockCCIPRouter");
    router = mockRouterInfo.address;
  } else {
    price = networkConfig[network.name].priceFeed;
    router = networkConfig[network.name].router;
  }
  await deploy("RewardReceiver", {
    from: deployer,
    log: true,
    args: [router, price],
  });
};

module.exports.tags = ["all", "recevier"];
