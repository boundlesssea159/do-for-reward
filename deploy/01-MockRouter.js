const { network } = require("hardhat");
module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy, log} = deployments
    const {deployer} = await getNamedAccounts()
    const networkName = network.name
    if (networkName === "hardhat") {
        await deploy("MockCCIPRouter", {
            contract: "MockCCIPRouter",
            from: deployer,
            log: true,
            args: [],
        })
    }
}

module.exports.tags = ["all", "mockRouter"]