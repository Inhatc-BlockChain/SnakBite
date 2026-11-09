import { configVariable, defineConfig } from "hardhat/config";
import hardhatIgnition from "@nomicfoundation/hardhat-ignition";
import hardhatKeystore from "@nomicfoundation/hardhat-keystore";

export default defineConfig({

  plugins: [
    hardhatIgnition,
    hardhatKeystore
  ],

  solidity: {
    version: "0.8.28"
  },

  networks: {

    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [
        configVariable("SEPOLIA_PRIVATE_KEY")
      ]
    }

  }
});
