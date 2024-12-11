const variant = require('../models/variant.models')

exports.createVariant = async (req, res) => {
    try {
        let { variantName, price, variantImage } = req.body

        let existVariantName = await variant.findOne({ variantName })

        if (existVariantName) {
            return res.status(409).json({ status: 409, success: false, message: "VarianName Is Alredy exist" })
        }

        if (!req.file) {
            return res.status(404).json({ status: 404, success: false, message: "Variant Image Is Required" })
        }

        existVariantName = await variant.create({
            variantName,
            price,
            variantImage: req.file.path
        })

        return res.status(201).json({ status: 201, success: true, message: "Varient Created SuccessFully...", data: existVariantName })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message });
    }
}

exports.getAllVariant = async (req, res) => {
    try {
        let page = parseInt(req.query.page)
        let pageSize = parseInt(req.query.pageSize)

        if (page < 1 || pageSize < 1) {
            return res.status(401).json({ status: 401, success: false, message: "Page And PageSize Cann't Be Less Than 1" })
        }

        let paginatedVariant;

        paginatedVariant = await variant.find()

        let count = paginatedVariant.length

        // if (count === 0) {
        //     return res.status(404).json({ status: 404, success: false, message: "Variant Not Found" })
        // }

        if (page && pageSize) {
            let startIndex = (page - 1) * pageSize
            let lastIndex = (startIndex + pageSize)
            paginatedVariant = await paginatedVariant.slice(startIndex, lastIndex)
        }

        return res.status(200).json({ status: 200, success: true, message: "All Varian Found SuccessFully...", data: paginatedVariant })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.getVariantById = async (req, res) => {
    try {
        let id = req.params.id

        let getVariantId = await variant.findById(id);

        if (!getVariantId) {
            return res.status(404).json({ status: 404, success: false, message: "Variant Not Found" });
        }

        return res.status(200).json({ status: 200, success: true, message: "Variant Found SuccessFully...", data: getVariantId });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.updateVariantById = async (req, res) => {
    try {
        let id = req.params.id

        let updateVariantId = await variant.findById(id)

        if (!updateVariantId) {
            return res.status(404).json({ status: 404, success: false, message: "Variant Not Found" })
        }

        if (req.file) {
            req.body.variantImage = req.file.path
        }

        updateVariantId = await variant.findByIdAndUpdate(id, { ...req.body }, { new: true })

        return res.status(200).json({ status: 200, success: true, message: "Varian Updated SuccessFully...", data: updateVariantId })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.deleteVariantById = async (req, res) => {
    try {
        let id = req.params.id

        let deleteVariantId = await variant.findById(id)

        if (!deleteVariantId) {
            return res.status(404).json({ status: 404, success: false, message: "Variant Not Found" })
        }

        await variant.findByIdAndDelete(id)

        return res.status(200).json({ status: 200, success: true, message: "Variant Delete SuccessFully..." })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}