const { network } = require("hardhat");
const { developmentChains } = require("../config.helper");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const DECIMALS = "8";
  const INITIAL_PRICE = "200000000000"; // 2000USD per ETH
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  if (developmentChains.includes(network.name)) {
    await deploy("MockV3Aggregator", {
      contract: "MockV3Aggregator",
      from: deployer,
      log: true,
      args: [DECIMALS, INITIAL_PRICE],
    });
  }
};

module.exports.tags = ["all", "mockV3Aggreator"];
