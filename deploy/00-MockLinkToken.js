const { network } = require("hardhat");
const { developmentChains } = require("../config.helper");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  if (developmentChains.includes(network.name)) {
    await deploy("MockLinkTokenWrapped", {
      contract: "MockLinkTokenWrapped",
      from: deployer,
      log: true,
      args: [],
    });
  }
};

module.exports.tags = ["all", "mockLinkToken"];
