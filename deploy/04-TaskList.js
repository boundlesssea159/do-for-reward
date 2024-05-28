const { network } = require("hardhat");
const { developmentChains, networkConfig } = require("../config.helper.js");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const deployer = (await getNamedAccounts()).deployer;
  let router, link, v3AggregatorAddress;
  if (developmentChains.includes(network.name)) {
    const mockV3AggregatorInfo = await deployments.get("MockV3Aggregator");
    v3AggregatorAddress = mockV3AggregatorInfo.address;
    const mockRouterInfo = await deployments.get("MockCCIPRouter");
    router = mockRouterInfo.address;
    const mockLinkTokenInfo = await deployments.get("MockLinkToken");
    link = mockLinkTokenInfo.address;
  } else {
    router = networkConfig[network.name].router;
    link = networkConfig[network.name].link;
    priceFeed = networkConfig[network.name].priceFeed;
  }
  await deploy("TaskList", {
    from: deployer,
    log: true,
    args: [router, link, v3AggregatorAddress],
  });
};

module.exports.tags = ["all", "task"];
