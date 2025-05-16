// models/Group.js
import mongoose from 'mongoose';

const GroupSchema = new mongoose.Schema({
  chatId:   { type: String, unique: true, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

export default mongoose.model('Group', GroupSchema);
