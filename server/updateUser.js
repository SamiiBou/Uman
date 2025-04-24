// Utilisation de la syntaxe ES Module au lieu de CommonJS
import { MongoClient } from 'mongodb';

// Connection URI
const uri = "mongodb+srv://samiboudechicha:M6OamXokmeWWr6Aj@cluster0.7tadri0.mongodb.net/socialid?retryWrites=true&w=majority&appName=Cluster0";

// Create a new MongoClient
const client = new MongoClient(uri);

async function updateVerifiedUsers() {
  try {
    // Connect to the MongoDB server
    await client.connect();
    console.log("Connected to MongoDB server");

    // Get the database and collection
    const database = client.db("socialid");
    const users = database.collection("users"); // Ajustez le nom de la collection si nécessaire
    
    // Rechercher les utilisateurs ayant au moins une vérification sociale
    // On vérifie si le champ socialVerifications existe, n'est pas null et n'est pas un objet vide
    const filter = { 
      socialVerifications: { 
        $exists: true,
        $ne: {},
        $not: { $size: 0 } // S'assure que l'objet n'est pas vide
      }
    };
    
    // Mettre à jour le champ verified à true
    const updateDoc = {
      $set: { verified: true }
    };
    
    // Exécuter la mise à jour
    const result = await users.updateMany(filter, updateDoc);
    
    console.log(`${result.matchedCount} utilisateurs trouvés avec des vérifications sociales.`);
    console.log(`${result.modifiedCount} utilisateurs ont été mis à jour à "verified: true".`);
    
  } catch (err) {
    console.error("Erreur lors de la mise à jour:", err);
  } finally {
    // Fermer la connexion
    await client.close();
    console.log("Connexion MongoDB fermée");
  }
}

// Exécuter la fonction
updateVerifiedUsers();