import fs                from "fs";
import path              from "path";
import { fileURLToPath } from "url";
// On importe directement la fonction pack+hash adaptée à v6
import { ethers, solidityPackedKeccak256 } from "ethers";

const __filename   = fileURLToPath(import.meta.url);
const __dirname    = path.dirname(__filename);
const artifactPath = path.join(
  __dirname,
  "../out/SocialVerificationRegistry.sol/SocialVerificationRegistry.json"
);
const artifact     = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const registryAbi  = artifact.abi;

const REGISTRY_ADDRESS = process.env.REGISTRY_ADDRESS;
const RPC_URL          = process.env.RPC_URL;
const RELAYER_KEY      = process.env.RELAYER_PRIVATE_KEY;

export async function writeVerificationOnChain({
  providerName,
  userId,
  walletAddress,
  proof
}) {
  // console.log("=== writeVerificationOnChain START ===");
  // console.log("Input params:", { providerName, userId, walletAddress, proof });

  // Helper pour s’assurer qu’on a bien un bytes32
  function normalizeBytes32(hexStr) {
    // console.log("normalizeBytes32 input:", hexStr);
    if (typeof hexStr !== "string") {
      throw new Error(`Invalid bytes32 value (not a string): ${hexStr}`);
    }
    let h = hexStr.startsWith("0x") ? hexStr.slice(2) : hexStr;
    if (h.length % 2 === 1) {
      h = "0" + h;
      // console.log("Added leading zero for odd length:", h);
    }
    if (h.length > 64) {
      throw new Error(`Hex string too long for bytes32: 0x${h}`);
    }
    h = h.padStart(64, "0");
    const normalized = "0x" + h;
    // console.log("Normalized bytes32:", normalized);
    return normalized;
  }

  // Extraction des champs de proof
  const rawMerkle     = proof.merkle_root ?? proof.merkleRoot;
  const rawNullifier  = proof.nullifier_hash ?? proof.nullifierHash;
  // console.log("Raw merkle root:", rawMerkle);
  // console.log("Raw nullifier hash:", rawNullifier);

  const merkleRoot    = normalizeBytes32(rawMerkle);
  const nullifierHash = normalizeBytes32(rawNullifier);

  // Calcul du proofHash via solidityPackedKeccak256 (pack + keccak) :contentReference[oaicite:0]{index=0}
  let proofHash;
  try {
    proofHash = solidityPackedKeccak256(
      ["string", "string", "address", "bytes32", "bytes32"],
      [providerName, userId, walletAddress, merkleRoot, nullifierHash]
    );
    // console.log("Computed proofHash:", proofHash);
  } catch (err) {
    console.error("Error computing proofHash:", err);
    throw err;
  }

  // Connexion au réseau
  // console.log("🔍 Attempting RPC URL:", process.env.RPC_URL);

  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  let network;
  try {
    network = await provider.getNetwork();
    // console.log("Connected network:", network);
  } catch (err) {
    console.error("Error fetching network:", err);
    throw err;
  }

  // Vérification que le contrat existe bien
  let code;
  try {
    code = await provider.getCode(REGISTRY_ADDRESS);
    // console.log("Contract code at address:", code);
    if (code === "0x") {
      throw new Error(
        `No contract deployed at ${REGISTRY_ADDRESS} on network ${network.chainId}`
      );
    }
  } catch (err) {
    console.error("Error checking contract code:", err);
    throw err;
  }

  // Préparation du signer
  const signer = new ethers.Wallet(RELAYER_KEY, provider);
  try {
    const relayerAddress = await signer.getAddress();
    // console.log("Using relayer address:", relayerAddress);
  } catch (err) {
    console.error("Error getting relayer address:", err);
    throw err;
  }

  // Instanciation du contrat
  const registry = new ethers.Contract(REGISTRY_ADDRESS, registryAbi, signer);
  // console.log(
    "Contract methods available:",
    registry.interface.fragments.map((f) => f.name).filter(Boolean)
  );

  // Envoi de la transaction
  let txResponse;
  try {
    txResponse = await registry.recordVerification(providerName, proofHash);
    // console.log("Transaction sent, hash:", txResponse.hash);
  } catch (err) {
    console.error("Error sending transaction:", err);
    throw err;
  }

  // Attente de confirmation
  let receipt;
  try {
    receipt = await txResponse.wait(1);
    // console.log("Transaction confirmed in block:", receipt.blockNumber);
  } catch (err) {
    console.error("Error waiting for confirmation:", err);
    throw err;
  }

  // Inspection des logs
  // console.log("Raw logs array:", receipt.logs);
  if (receipt.events && receipt.events.length > 0) {
    // console.log("Decoded events:", receipt.events);
  } else {
    console.warn(
      "No decoded events. Check if ABI contains SocialVerified event and indexed params."
    );
  }

  // console.log("=== writeVerificationOnChain END ===");
  return {
    txHash:   txResponse.hash,
    proofHash
  };
}
