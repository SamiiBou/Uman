// script.cjs
const fs   = require("fs");
const path = require("path");
const { ethers } = require("ethers");
require("dotenv").config({
  path: path.resolve(__dirname, "../.env")
});

// Chargez l’ABI ERC20
const erc20Abi = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../abis/ERC20.json"),
    "utf-8"
  )
);

// Votre code de funding
(async () => {
  const provider    = new ethers.JsonRpcProvider(process.env.RPC_URL);

  const adminSigner = new ethers.Wallet(process.env.TOKEN_PRIVATE_KEY, provider);
  const token       = new ethers.Contract(
    process.env.TOKEN_CONTRACT_ADDRESS,
    erc20Abi,
    adminSigner
  );
  const amount = ethers.parseUnits("1000000", 18);
  const tx     = await token.transfer(process.env.DISTRIBUTOR_ADDRESS, amount);
  console.log("Funding tx hash:", tx.hash);
  await tx.wait();
  console.log("Distributor funded ✅");
})();
