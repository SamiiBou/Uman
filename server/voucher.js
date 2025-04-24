import { ethers } from "ethers";

const domain = {
  name: "Distributor",
  version: "1",
  chainId: +process.env.WORLDCHAIN_CHAIN_ID,
  verifyingContract: process.env.DISTRIBUTOR_ADDRESS
};

const types = {
  Voucher: [
    { name: "to",       type: "address" },
    { name: "amount",   type: "uint256" },
    { name: "nonce",    type: "uint256" },
    { name: "deadline", type: "uint256" }
  ]
};

const admin = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY);

export async function createVoucher(to: string, amount: string) {
  const nonce    = Date.now();                            // ou compteur BDD
  const deadline = Math.floor(Date.now()/1000) + 3600;    // +1h
  const voucher  = { to, amount: ethers.parseUnits(amount, 18), nonce, deadline };
  const sig      = await admin._signTypedData(domain, types, voucher);
  return { voucher, signature: sig };
}
