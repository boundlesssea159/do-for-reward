const { network } = require("hardhat");
const { developmentChains, networkConfig } = require("../config.helper.js");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const deployer = (await getNamedAccounts()).deployer;
  let router, link, priceFeed;
  if (developmentChains.includes(network.name)) {
    const mockRouterInfo = await deployments.get("MockCCIPRouter");
    router = mockRouterInfo.address;
    const mockLinkTokenInfo = await deployments.get("MockLinkTokenWrapped");
    link = mockLinkTokenInfo.address;
    const mockV3AggregatorInfo = await deployments.get("MockV3Aggregator");
    priceFeed = mockV3AggregatorInfo.address;
  } else {
    router = networkConfig[network.name].router;
    link = networkConfig[network.name].link;
    priceFeed = networkConfig[network.name].priceFeed;
  }
  await deploy("Tasks", {
    from: deployer,
    log: true,
    args: [router, link, priceFeed],
  });
};

module.exports.tags = ["all", "tasks"];
