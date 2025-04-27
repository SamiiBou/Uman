import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

// 3. Configurer le client S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'sa-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// 4. Fonction pour générer une URL présignée pour accéder temporairement à une image
export async function getPresignedUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME || 'uman-id-cards',
    Key: key
  });

  try {
    // L'URL expire après expiresIn secondes (1 heure par défaut)
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('Erreur lors de la génération de l\'URL présignée:', error);
    throw error;
  }
}

// 5. Fonction pour télécharger une image sur S3
export async function uploadToS3(file, key, contentType) {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME || 'uman-id-cards',
    Key: key,
    Body: file,
    ContentType: contentType
  });

  try {
    const response = await s3Client.send(command);
    return response;
  } catch (error) {
    console.error('Erreur lors du téléchargement vers S3:', error);
    throw error;
  }
}

// 6. Fonction pour générer une URL présignée pour accéder temporairement à un défi
export async function getPresignedChallengeUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_CHALLENGE_BUCKET_NAME,
    Key: key
  });
  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('Erreur lors de la génération de l\'URL présignée pour challenge:', error);
    throw error;
  }
}

// 7. Fonction pour télécharger un défi sur S3
export async function uploadToChallengeS3(file, key, contentType) {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_CHALLENGE_BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType
  });
  try {
    return await s3Client.send(command);
  } catch (error) {
    console.error('Erreur lors du téléchargement vers le bucket de challenges S3:', error);
    throw error;
  }
}