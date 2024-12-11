const mongoose = require('mongoose')

const orderSchema = mongoose.Schema({
    table: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'table',
        require: true
    },
    orderId: {
        type: String,
        require: true
    },
    items: [{
        dish: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'dish',
            require: true
        },
        variant: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'variant',
            require: true
        }],
        quantity: {
            type: Number,
            require: true
        },
        status: {
            type: String,
            enum: ['Pending', 'Preparing', 'Served', 'Cancelled', 'Completed'],
            default: 'Pending'
        },
        addInstruction: {
            type: String,
            require: true
        },
        subTotal: {
            type: Number,
            default: 0
        }
    }],
    status: {
        type: String,
        enum: ['Pending', 'Completed'],
        default: "Pending",
        require: true
    },
    totalPrice: {
        type: Number,
        require: true,
        default: 0
    },
}, {
    timestamps: true,
    versionKey: false
});

module.exports = mongoose.model('order', orderSchema)