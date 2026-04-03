require('dotenv').config({ path: require('path').resolve(__dirname, '../backend/.env') });
require("@nomicfoundation/hardhat-toolbox");

// Validate private key format
function getAccounts() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) return [];
  // Must be 64 hex chars (32 bytes) with optional 0x prefix
  const cleanPk = pk.startsWith('0x') ? pk.slice(2) : pk;
  if (cleanPk.length === 64 && /^[0-9a-fA-F]+$/.test(cleanPk)) {
    return [pk.startsWith('0x') ? pk : `0x${pk}`];
  }
  console.warn('Warning: PRIVATE_KEY is not a valid 32-byte hex string');
  return [];
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: process.env.RPC_URL || "",
      accounts: getAccounts(),
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
  defaultNetwork: "sepolia"
};
