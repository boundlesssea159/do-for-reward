require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const deployer = (await getNamedAccounts()).deployer;

  const taskList = await deploy("TaskList", {
    from: deployer,
    log: true,
    args: ["0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59"],
  });

  console.log("TaskList contract has deployed:", taskList.address);
};

module.exports.tags = ["all", "task"];
