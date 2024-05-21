require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const deployer = (await getNamedAccounts()).deployer;

  const taskList = await deploy("TaskList", {
    from: deployer,
    log: true,
    args: [],
  });

  console.log("TaskList contract has deployed:", taskList.address);
};

module.exports.tags = ["all", "task"];
