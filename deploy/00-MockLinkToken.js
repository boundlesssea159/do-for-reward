const { network } = require("hardhat");
const { developmentChains } = require("../config.helper");

if (developmentChains.includes(network.name)) {
  module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    await deploy("MockLinkToken", {
      contract: "MockLinkToken",
      from: deployer,
      log: true,
      args: [],
    });
  };
  module.exports.tags = ["all", "mockLinkToken"];
}
