import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-web3";
require("@nomiclabs/hardhat-truffle5");
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";

// import { vars } from "hardhat/config";
const { vars } = require("hardhat/config");
dotenv.config();

// Load environment variables
const PRIVATE_KEY_1 = process.env.PRIVATE_KEY_1 ?? "";
const PRIVATE_KEY_2 = process.env.PRIVATE_KEY_2 ?? "";
const PRIVATE_KEY_3 = process.env.PRIVATE_KEY_3 ?? "";
const PRIVATE_KEY_4 = process.env.PRIVATE_KEY_4 ?? "";
const PRIVATE_KEY_5 = process.env.PRIVATE_KEY_5 ?? "";
const FLARE_RPC_API_KEY = process.env.FLARE_RPC_API_KEY ?? "";
const FLARESCAN_API_KEY = process.env.FLARESCAN_API_KEY ?? "";
const FLARE_EXPLORER_API_KEY = process.env.FLARE_EXPLORER_API_KEY ?? "";

const COSTON_RPC_URL = process.env.COSTON_RPC_URL ?? "";
const COSTON2_RPC_URL = process.env.COSTON2_RPC_URL ?? "";
const SONGBIRD_RPC_URL = process.env.SONGBIRD_RPC_URL ?? "";
const FLARE_RPC_URL = process.env.FLARE_RPC_URL ?? "";
const ETHERSCAN_API_URL = process.env.ETHERSCAN_API_URL ?? "";

const VERIFIER_API_KEY_TESTNET = process.env.VERIFIER_API_KEY_TESTNET ?? "";

const USE_FLARESCAN = process.env.USE_FLARESCAN ?? false;

const GOERLI_API_URL = process.env.GOERLI_API_URL ?? "";
const SEPOLIA_API_KEY = process.env.SEPOLIA_API_KEY ?? "";

// Create accounts array for networks
const accounts = [PRIVATE_KEY_1, PRIVATE_KEY_2, PRIVATE_KEY_3, PRIVATE_KEY_4, PRIVATE_KEY_5].filter(key => key !== "");

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.25",
        settings: {
          evmVersion: "london",
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    goerli: {
      url: `https://eth-goerli.alchemyapi.io/v2/${GOERLI_API_URL}`,
      accounts: accounts,
    },
    sepolia: {
      url: `https://rpc.ankr.com/eth_sepolia/${SEPOLIA_API_KEY}`,
      accounts: accounts,
    },
    coston: {
      url: FLARE_RPC_API_KEY
        ? `https://coston-api-tracer.flare.network/ext/C/rpc?x-apikey=${FLARE_RPC_API_KEY}`
        : "https://coston-api.flare.network/ext/C/rpc",
      accounts: accounts,
      chainId: 16,
    },
    coston2: {
      url: "https://coston2-api.flare.network/ext/bc/C/rpc",
      chainId: 114,
      accounts: accounts,
    },
    songbird: {
      url: FLARE_RPC_API_KEY
        ? `https://songbird-api-tracer.flare.network/ext/C/rpc?x-apikey=${FLARE_RPC_API_KEY}`
        : "https://songbird-api.flare.network/ext/C/rpc",
      accounts: accounts,
      chainId: 19,
    },
    flare: {
      url: FLARE_RPC_API_KEY
        ? `https://flare-api-tracer.flare.network/ext/C/rpc?x-apikey=${FLARE_RPC_API_KEY}`
        : "https://flare-api.flare.network/ext/C/rpc",
      accounts: accounts,
      chainId: 14,
    },
  },
  etherscan: {
    apiKey: {
      goerli: `${ETHERSCAN_API_URL}`,
      coston: `${FLARESCAN_API_KEY}`,
      coston2: "not-needed",
      songbird: `${FLARESCAN_API_KEY}`,
      flare: `${FLARESCAN_API_KEY}`,
      sepolia: `${ETHERSCAN_API_URL}`,
    },
    customChains: [
      {
        network: "coston",
        chainId: 16,
        urls: {
          // faucet: https://faucet.towolabs.com/
          apiURL:
            "https://coston-explorer.flare.network/api" +
            (FLARE_EXPLORER_API_KEY
              ? `?x-apikey=${FLARE_EXPLORER_API_KEY}`
              : ""), // Must not have / endpoint
          browserURL: "https://coston-explorer.flare.network",
        },
      },
      {
        network: "coston2",
        chainId: 114,
        urls: {
          apiURL: "https://coston2-explorer.flare.network/api",
          browserURL: "https://coston2-explorer.flare.network",
        },
      },
      {
        network: "songbird",
        chainId: 19,
        urls: {
          apiURL:
            "https://songbird-explorer.flare.network/api" +
            (FLARE_EXPLORER_API_KEY
              ? `?x-apikey=${FLARE_EXPLORER_API_KEY}`
              : ""), // Must not have / endpoint
          browserURL: "https://songbird-explorer.flare.network/",
        },
      },
      {
        network: "flare",
        chainId: 14,
        urls: {
          apiURL:
            "https://flare-explorer.flare.network/api" +
            (FLARE_EXPLORER_API_KEY
              ? `?x-apikey=${FLARE_EXPLORER_API_KEY}`
              : ""), // Must not have / endpoint
          browserURL: "https://flare-explorer.flare.network/",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts/",
    tests: "./test/",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  typechain: {
    target: "truffle-v5",
  },
};

if (USE_FLARESCAN) {
  const FLARESCAN_DATA = [
    {
      apiURL: "https://api.routescan.io/v2/network/testnet/evm/16/etherscan",
      browserURL: "https://coston.testnet.flarescan.com",
    },
    {
      apiURL: "https://api.routescan.io/v2/network/testnet/evm/114/etherscan",
      browserURL: "https://coston2.testnet.flarescan.com",
    },
    {
      apiURL: "https://api.routescan.io/v2/network/mainnet/evm/19/etherscan",
      browserURL: "https://songbird.flarescan.com",
    },
    {
      apiURL: "https://api.routescan.io/v2/network/mainnet/evm/14/etherscan",
      browserURL: "https://mainnet.flarescan.com",
    },
  ];

  for (let i = 0; i < FLARESCAN_DATA.length; i++) {
    config.etherscan.customChains[i].urls = FLARESCAN_DATA[i];
  }
}

export default config;
