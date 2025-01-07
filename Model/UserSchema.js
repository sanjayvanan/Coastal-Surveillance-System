const mongoose= require("mongoose")


// User Schema
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false }
});

const UserModel = mongoose.model('users', UserSchema);

module.exports = UserModel