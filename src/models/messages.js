import mongoose from 'mongoose';

const Schema = mongoose.Schema;

var messageSchema = Schema({
    to: Schema.Types.ObjectId,
    from: Schema.Types.ObjectId,
    type: String,
    message: String
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

var Message = mongoose.model('Message', messageSchema);
export default Message;
