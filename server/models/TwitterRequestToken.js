import mongoose from 'mongoose';

const TwitterRequestTokenSchema = new mongoose.Schema({
  oauthToken: { type: String, required: true, unique: true },
  oauthTokenSecret: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 }
});

export default mongoose.model('TwitterRequestToken', TwitterRequestTokenSchema);