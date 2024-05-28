const networkConfig = {
  sepolia: {
    chainId: 11155111,
    router: "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59",
    link: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    priceFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
  },
  fuji: {
    chainId: 43113,
    router: "0xF694E193200268f9a4868e4Aa017A0118C9a8177",
    link: "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846",
    priceFeed: "0x5498BB86BC934c8D34FDA08E81D444153d0D06aD",
  },
};

const developmentChains = ["hardhat", "localhost"];

module.exports = { networkConfig, developmentChains };
