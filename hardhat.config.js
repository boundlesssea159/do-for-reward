require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy");
require("dotenv").config();
require("solidity-coverage");
require("hardhat-gas-reporter");

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const FUJI_RPC_URL = process.env.FUJI_RPC_URL;
const USER1_PRIVATE_KEY = process.env.USER1_PRIVATE_KEY;
const USER2_PRIVATE_KEY = process.env.USER2_PRIVATE_KEY;

module.exports = {
  solidity: "0.8.24",
  defaultNetWork: "hardhat",
  networks: {
    hardhat: {},
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [USER1_PRIVATE_KEY, USER2_PRIVATE_KEY],
      chainId: 11155111,
      saveDeployments: true,
    },
    fuji: {
      url: FUJI_RPC_URL,
      accounts: [USER1_PRIVATE_KEY, USER2_PRIVATE_KEY],
      chainId: 43113,
      saveDeployments: true,
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
      1: 0,
    },
    user1: {
      default: 1,
      1: 1,
    },
  },
  mocha: {
    timout: 10000000,
  },
  gasReporter: {
    enabled: false,
  },
};
