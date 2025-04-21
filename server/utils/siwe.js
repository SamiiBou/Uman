import { SiweMessage } from 'siwe';

export async function verifySiweMessage(payload, expectedNonce) {
  try {
    // Création d'un objet SiweMessage à partir du payload
    const message = new SiweMessage(payload.message);
    
    // Vérification de la signature
    const fields = await message.validate(payload.signature);
    
    // Vérifier si le nonce correspond
    if (fields.nonce !== expectedNonce) {
      return { isValid: false, error: 'Invalid nonce' };
    }
    
    // Vérification de l'adresse
    if (fields.address.toLowerCase() !== payload.address.toLowerCase()) {
      return { isValid: false, error: 'Address mismatch' };
    }
    
    return { isValid: true, fields };
  } catch (error) {
    console.error('SIWE validation error:', error);
    return { isValid: false, error: error.message };
  }
}