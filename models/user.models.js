const mongoose = require('mongoose')

const userSchema = mongoose.Schema({
    name: {
        type: String,
        require: true
    },
    email: {
        type: String,
        require: true,
        unique: true
    },
    contact: {
        type: String,
        require: true
    },
    role: {
        type: String,
        require: true
    },
    otp: {
        type: Number,
        require: true
    },
    image: {
        type: String,
        require: true
    },
    fcmToken: {
        type: String,
        require: true
    }
}, {
    timestamps: true,
    versionKey: false
});

module.exports = mongoose.model('user', userSchema);