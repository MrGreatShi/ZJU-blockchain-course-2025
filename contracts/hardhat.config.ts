import { HardhatUserConfig } from "hardhat/config.js";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    ganache: {
      // rpc url, change it according to your ganache configuration
      url: 'http://localhost:8545',
      // the private key of signers, change it according to your ganache user
      accounts: [
        '0xd9853cd1bf9a6e85219d07392fb3d19b6afb757796712e5dfdd5f3e30f6e8aaa',
        '0xe69874bd4e45f7764cc1ea98f82bb395cc6f9c4d61e8e5e2decd7ae82550dded',
        '0x27211bb7840f65759914519d8d1539645fb2a9f095d8d1c2f8a016ff156a6cb5'
      ]
    },
  },
};

export default config;
