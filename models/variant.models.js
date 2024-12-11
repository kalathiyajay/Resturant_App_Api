const mongoose = require('mongoose')

const variantSchema = mongoose.Schema({
    variantName: {
        type: String,
        require: true
    },
    price: {
        type: Number,
        require: true
    },
    variantImage: {
        type: String,
        require: true
    }
}, {
    timestamps: true,
    versionKey: false
});

module.exports = mongoose.model('variant', variantSchema)