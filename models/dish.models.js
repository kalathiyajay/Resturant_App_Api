const mongoose = require('mongoose')

const dishSchema = mongoose.Schema({
    dishName: {
        type: String,
        require: true
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'category',
        require: true
    },
    description: {
        type: String,
        require: true
    },
    price: {
        type: String,
        require: true
    },
    dishImage: {
        type: String,
        require: true
    },
    variant: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'variant',
        require: true
    }],
    status: {
        type: String,
        enum: ['Available', 'Not available'],
        require: true
    }
}, {
    timestamps: true,
    versionKey: false
});

module.exports = mongoose.model('dish', dishSchema);