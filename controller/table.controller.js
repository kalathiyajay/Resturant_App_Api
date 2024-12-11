const table = require('../models/table.models')

exports.createTable = async (req, res) => {
    try {
        let { tableName, tableMember } = req.body

        let existTableName = await table.findOne({ tableName })

        if (existTableName) {
            return res.status(409).json({ status: 409, success: false, message: "TableName Alredy exist..." })
        }

        existTableName = await table.create({
            tableName,
            tableMember
        })

        return res.status(201).json({ status: 201, success: true, message: "Table Created SuccessFully...", data: existTableName });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.getAllTables = async (req, res) => {
    try {
        let page = parseInt(req.query.page)
        let pageSize = parseInt(req.query.pageSize)

        if (page < 1 || pageSize < 1) {
            return res.status(401).json({ status: 401, success: false, message: "Page And PageSize Cann't Be Less Than 1" })
        }

        let paginatedTables

        paginatedTables = await table.find()

        let count = paginatedTables.length

        // if (count === 0) {
        //     return res.status(404).json({ status: 404, success: false, message: "Table Not Found" })
        // }

        if (page && pageSize) {
            let startIndex = (page - 1) * pageSize
            let lastIndex = (startIndex + pageSize)
            paginatedTables = await paginatedTables.slice(startIndex, lastIndex)
        }

        return res.status(200).json({ status: 200, success: true, totalDish: count, message: "All Tables Found SuccessFully...", data: paginatedTables });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.getTableById = async (req, res) => {
    try {
        let id = req.params.id

        let getTableId = await table.findById(id)

        if (!getTableId) {
            return res.status(404).json({ status: 404, success: false, message: "Table Not Found" })
        }

        return res.status(200).json({ status: 200, success: true, message: "Table Found SuccessFully...", data: getTableId });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.updateTableById = async (req, res) => {
    try {
        let id = req.params.id

        let updateTableId = await table.findById(id)

        if (!updateTableId) {
            return res.status(404).json({ status: 404, success: false, message: "Table Not Found" })
        }

        updateTableId = await table.findByIdAndUpdate(id, { ...req.body }, { new: true });

        return res.status(200).json({ status: 200, success: true, message: "Table Update SuccessFully...", data: updateTableId });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.deleteTableById = async (req, res) => {
    try {
        let id = req.params.id

        let deleteTableId = await table.findById(id)

        if (!deleteTableId) {
            return res.status(404).json({ status: 404, success: false, message: "Table Not Found" })
        }

        await table.findByIdAndDelete(id)

        return res.status(200).json({ status: 200, success: true, message: "Table Delete SuccessFully..." })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}
