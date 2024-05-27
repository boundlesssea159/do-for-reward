const networkConfig = {
  sepolia: {
    chainId: 11155111,
    router: "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59",
  },
  fuji: {
    chainId: 43113,
    router: "0xF694E193200268f9a4868e4Aa017A0118C9a8177",
  },
};

const developmentChains = ["hardhat", "localhost"];

module.exports = { networkConfig, developmentChains };
