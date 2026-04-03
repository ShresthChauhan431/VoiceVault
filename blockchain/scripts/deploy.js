const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting VoiceVault deployment...\n");

  // 1. Deploy VoiceIDSBT first with placeholder vault address
  console.log("Deploying VoiceIDSBT...");
  const sbt = await ethers.deployContract("VoiceIDSBT", [
    "Voice Vault ID",
    "VVID",
    ethers.ZeroAddress,
  ]);
  await sbt.waitForDeployment();
  console.log("VoiceIDSBT deployed to:", sbt.target);

  // 2. Deploy VoiceVault
  console.log("\nDeploying VoiceVault...");
  const vault = await ethers.deployContract("VoiceVault");
  await vault.waitForDeployment();
  console.log("VoiceVault deployed to:", vault.target);

  // 3. Set the real vault address on the SBT
  console.log("\nSetting vault address on SBT...");
  const tx = await sbt.setVaultAddress(vault.target);
  await tx.wait();
  console.log("Vault address set on SBT");

  // 4. Deploy FraudRegistry
  console.log("\nDeploying FraudRegistry...");
  const registry = await ethers.deployContract("FraudRegistry");
  await registry.waitForDeployment();
  console.log("FraudRegistry deployed to:", registry.target);

  // 5. Print all addresses
  console.log("\n========================================");
  console.log("Deployment Complete!");
  console.log("========================================");
  console.log("VoiceVault deployed to:", vault.target);
  console.log("VoiceIDSBT deployed to:", sbt.target);
  console.log("FraudRegistry deployed to:", registry.target);

  // 6. Write deployedAddresses.json
  const addresses = {
    voiceVault: vault.target,
    voiceIDSBT: sbt.target,
    fraudRegistry: registry.target,
  };

  const outputPath = path.join(__dirname, "../deployedAddresses.json");
  fs.writeFileSync(outputPath, JSON.stringify(addresses, null, 2));
  console.log("\nAddresses written to:", outputPath);
}

main().catch(console.error);
