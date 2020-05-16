import mongoose from 'mongoose';

const Schema = mongoose.Schema;

var userSchema = Schema({
    name: String,
    email: {
        type: String ,
        required: true
    },
    isOnline: Boolean
});

var User = mongoose.model('User', userSchema);
export default User;
