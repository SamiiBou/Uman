// utils/worldIdVerifier.js
import axios from 'axios';

/**
 * Verifies a World ID proof against the World ID cloud API
 * 
 * @param {Object} proof - The proof object from MiniKit
 * @param {string} app_id - The World ID app ID from your environment variables
 * @param {string} action - The action string (should match frontend)
 * @param {string} signal - The signal string (if any)
 * @returns {Object} - Response with success status and any errors
 */
export async function verifyCloudProof(proof, app_id, action, signal) {
  try {
    if (!app_id) {
      throw new Error("APP_ID not configured in environment variables");
    }

    if (!proof || typeof proof !== 'object') {
      throw new Error("Invalid proof format");
    }

    // Extract necessary fields from the proof payload
    const { merkle_root, nullifier_hash, proof: zkProof } = proof;

    if (!merkle_root || !nullifier_hash || !zkProof) {
      throw new Error("Proof missing required fields");
    }

    // Call World ID Cloud API to verify the proof
    const response = await axios.post('https://developer.worldcoin.org/api/v1/verify', {
      merkle_root,
      nullifier_hash,
      proof: zkProof,
      verification_level: "orb", // Adjust based on your requirements
      app_id,
      action,
      signal: signal || ""
    });

    if (response.status === 200) {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: response.data.code || "Unknown verification error" 
      };
    }
  } catch (error) {
    console.error("World ID verification error:", error);
    
    // Check if it's an Axios error with a response
    if (error.response) {
      return {
        success: false,
        error: error.response.data.code || error.response.data.message || error.message
      };
    }
    
    return {
      success: false,
      error: error.message || "Unknown error during verification"
    };
  }
}