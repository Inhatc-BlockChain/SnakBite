import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("SnakBiteModule", (m) => {
  const snakBite = m.contract("SnakBite");

  return { snakBite };
});
