// script.cjs
const fs   = require("fs");
const path = require("path");
const { ethers } = require("ethers");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const erc20Abi = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../abis/ERC20.json"), "utf-8")
);

(async () => {
  try {
    const provider    = new ethers.JsonRpcProvider(process.env.RPC_URL);
    console.log("Network :", await provider.getNetwork());
    console.log("Block   :", await provider.getBlockNumber());

    const adminSigner = new ethers.Wallet(process.env.TOKEN_PRIVATE_KEY, provider);
    const token       = new ethers.Contract(
      process.env.TOKEN_CONTRACT_ADDRESS,
      erc20Abi,
      adminSigner
    );

    const amount = ethers.parseUnits("1000000", 18);
    const tx     = await token.transfer(process.env.DISTRIBUTOR_ADDRESS, amount);
    console.log("Funding tx hash:", tx.hash);

    // Option 1 : ne pas attendre
    // console.log("Distributor funded (pending) ✅");
    
    // Option 2 : attendre la 1ère confirmation
    const receipt = await tx.wait(1);
    console.log("Mined in block", receipt.blockNumber);
    console.log("Distributor funded ✅");

  } catch (err) {
    console.error("Erreur :", err);
    process.exit(1);
  }
})();
