const billPayment = require('../models/billPayment.models');
const Table = require('../models/table.models')
const order = require('../models/order.models');

exports.generateBill = async (req, res) => {
    try {
        let { table, orderId } = req.body

        let existOrder = await billPayment.findOne({ orderId })

        if (existOrder) {
            return res.status(404).json({ status: 404, success: false, message: "Order Alredy exist" })
        }

        let checkTable = await Table.findById(table)
        let checkOrder = await order.findById(orderId)

        if (!checkTable) {
            return res.status(404).json({ status: 404, success: true, message: "Table Not Found" })
        }

        existOrder = await billPayment.create({
            table,
            orderId,
        })

        checkTable.status = "Available";
        checkOrder.status = "Completed";

        await checkTable.save();
        await checkOrder.save();

        return res.status(201).json({ status: 201, success: true, message: "BillPayment Create SuccessFully...", data: existOrder });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.getAllGenerateBills = async (req, res) => {
    try {
        let page = parseInt(req.query.page)
        let pageSize = parseInt(req.query.pageSize)

        if (page < 1 || pageSize < 1) {
            return res.status(401).json({ status: 401, success: false, message: "Page And PageSize Cann't Be Less Than 1" })
        }

        let paginatedGenerateBills;

        paginatedGenerateBills = await billPayment.find().sort({ createdAt: -1 }).populate('table', 'tableName').populate('orderId', 'orderId')

        let count = paginatedGenerateBills.length

        // if (count === 0) {
        //     return res.status(404).json({ status: 404, success: false, message: "Generate Bill Not Found" })
        // }

        if (page && pageSize) {
            let startIndex = (page - 1) * pageSize
            let lastIndex = (startIndex + pageSize)
            paginatedGenerateBills = await paginatedGenerateBills.slice(startIndex, lastIndex)
        }

        return res.status(200).json({ status: 200, success: true, totalBillPayments: count, message: "All Generate Bill Found SuccessFully...", data: paginatedGenerateBills });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.getGenerateBillsById = async (req, res) => {
    try {
        let id = req.params.id

        let getGenerateBillsId = await billPayment.findById(id).populate('table', 'tableName').populate('orderId', 'orderId')

        if (!getGenerateBillsId) {
            return res.status(404).json({ status: 404, success: false, message: "Generate Bill Not Found" })
        }

        return res.status(200).json({ status: 200, success: true, message: "Generate Bill Found SuccessFully...", data: getGenerateBillsId });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.generateBillPayment = async (req, res) => {
    try {
        let id = req.params.id

        let getGenerateBillId = await billPayment.findById(id)

        if (!getGenerateBillId) {
            return res.status(404).json({ status: 404, success: false, message: "Generate Bill Not Found" })
        }

        getGenerateBillId.status = "Paid"

        await getGenerateBillId.save();

        return res.status(200).json({ status: 200, success: true, message: "Payment SuccessFully", data: getGenerateBillId });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message });
    }
}