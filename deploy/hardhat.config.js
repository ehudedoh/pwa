require('dotenv').config();
require('@nomiclabs/hardhat-ethers');

const { PRIVATE_KEY, RPC_URL_MUMBAI, RPC_URL_MAINNET } = process.env;

module.exports = {
  solidity: {
    compilers: [{ version: '0.8.19' }]
  },
  networks: {
    polygon_mumbai: {
      url: RPC_URL_MUMBAI || 'https://rpc-mumbai.maticvigil.com',
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
    },
    polygon_mainnet: {
      url: RPC_URL_MAINNET || 'https://polygon-rpc.com',
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
    }
  }
};
