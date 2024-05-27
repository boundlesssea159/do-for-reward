const { networkConfig } = require("../config.helper.js");
const { network } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const deployer = (await getNamedAccounts()).deployer;
  let v3AggregatorAddress, router, link;
  if (network.name == "hardhat") {
    const mockV3AggregatorInfo = await deployments.get("MockV3Aggregator");
    v3AggregatorAddress = mockV3AggregatorInfo.address;
    const mockRouterInfo = await deployments.get("MockCCIPRouter");
    router = mockRouterInfo.address;
    const mockLinkTokenInfo = await deployments.get("MockLinkToken");
    link = mockLinkTokenInfo.address;
  } else {
    v3AggregatorAddress = networkConfig.sepolia.priceFeed;
    router = networkConfig.sepolia.router;
    link = networkConfig.sepolia.link;
  }
  await deploy("TaskList", {
    from: deployer,
    log: true,
    args: [router, link, v3AggregatorAddress],
  });
};

module.exports.tags = ["all", "task"];
