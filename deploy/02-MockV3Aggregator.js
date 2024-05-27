const { network } = require("hardhat");
const DECIMALS = "8";
const INITIAL_PRICE = "200000000000"; // 2000USD per ETH
module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const networkName = network.name;
  if (networkName === "hardhat") {
    await deploy("MockV3Aggregator", {
      contract: "MockV3Aggregator",
      from: deployer,
      log: true,
      args: [DECIMALS, INITIAL_PRICE],
    });
  }
};

module.exports.tags = ["all", "mockV3Aggreator"];