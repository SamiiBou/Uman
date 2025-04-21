import { ethers } from 'ethers';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const rpcUrl = process.env.RPC_URL || 'https://worldchain-mainnet.g.alchemy.com/v2/vCq59BHgMYA2JIRKAbRPmIL8OaTeRAgu';
const privateKey = process.env.TOKEN_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;
// Adresse du contrat ERC-20 (configurable; PULSE token par défaut)
const tokenAddress = process.env.TOKEN_CONTRACT_ADDRESS || process.env.PULSE_TOKEN_ADDRESS || '0x41Da2F787e0122E2e6A72fEa5d3a4e84263511a8';

if (!privateKey || !tokenAddress) {
  console.warn('[Token Distributor] Missing TOKEN_PRIVATE_KEY or TOKEN_CONTRACT_ADDRESS in .env');
}

// ABI minimal ERC-20: uniquement transfer et événement Transfer (pour debug)
const abi = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 amount)'
];
// Nombre de décimales du token (18 par défaut; modifiable via TOKEN_DECIMALS)
const DECIMALS = parseInt(process.env.TOKEN_DECIMALS, 10) || 18;

// === CHANGEMENT ICI : instanciation pour ethers v6 ===
const provider = rpcUrl ? new ethers.JsonRpcProvider(rpcUrl) : null;
const wallet   = provider && privateKey ? new ethers.Wallet(privateKey, provider) : null;
const tokenContract = wallet && tokenAddress
  ? new ethers.Contract(tokenAddress, abi, wallet)
  : null;
// Logging initialization details
console.log(
  `[Token Distributor] Initialized with RPC_URL=${rpcUrl}, tokenAddress=${tokenAddress}` +
  (wallet ? `, distributor wallet=${wallet.address}` : `, wallet not configured`)
);

// (Décimales gérées manuellement via DECIMALS)

/**
 * Distribue des tokens ERC-20 à une adresse donnée.
 * @param {string} toAddress - Adresse destinataire.
 * @param {number|string} amountTokens - Nombre de tokens à envoyer.
 * @returns {Promise<ethers.providers.TransactionResponse>}
 */
export async function distributeTokens(toAddress, amountTokens) {
  console.log(`[Token Distributor] distributeTokens called for toAddress=${toAddress}, amountTokens=${amountTokens}`);
  // Debug wallet and token contract configuration
  console.log(`[Token Distributor] Distributor wallet address: ${wallet.address}`);
  console.log(`[Token Distributor] Token contract address: ${tokenAddress}`);
  if (!tokenContract) {
    throw new Error('Token distributor not initialized. Check your RPC_URL, TOKEN_PRIVATE_KEY and TOKEN_CONTRACT_ADDRESS');
  }
  const amount = ethers.parseUnits(amountTokens.toString(), DECIMALS);
  // Envoi de la transaction
  const tx = await tokenContract.transfer(toAddress, amount);
  // Log transaction details: note tx.to is the token contract, actual recipient is toAddress
  console.log(
    `[Token Distributor] Transaction sent: from=${tx.from}, toUser=${toAddress}, contract=${tokenAddress}, hash=${tx.hash}`
  );
  // Attendre la confirmation
  const receipt = await tx.wait();
  console.log(`[Token Distributor] Transaction confirmed in block ${receipt.blockNumber}`);
  // Debug: parser les logs d'événements
  receipt.logs.forEach((log, idx) => {
    try {
      const parsed = tokenContract.interface.parseLog(log);
      console.log(`[Token Distributor] Event[${idx}] ${parsed.name}:`, parsed.args);
    } catch (e) {
      // Log brut si non parsable
      console.log(`[Token Distributor] Log[${idx}] raw:`, log);
    }
  });
  return tx;
}

/**
 * Envoie 10 tokens de bienvenue à l'adresse donnée.
 * @param {string} toAddress
 * @returns {Promise<boolean>}
 */
export async function sendWelcomeTokens(toAddress) {
  try {
    const tx = await distributeTokens(toAddress, '10.0');
    console.log(`[Token Distributor] 10 welcome tokens sent to ${toAddress}. TxHash: ${tx.hash}`);
    return true;
  } catch (error) {
    console.error('[Token Distributor] Error sending welcome tokens:', error);
    return false;
  }
}
