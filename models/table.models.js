const mongoose = require('mongoose')

const tableSchema = mongoose.Schema({
    tableName: {
        type: String,
        require: true
    },
    tableMember: {
        type: Number
    },
    status: {
        type: String,
        enum: ['Available', 'Not available'],
        default: "Available"
    }
}, {
    timestamps: true,
    versionKey: false
});

module.exports = mongoose.model('table', tableSchema)