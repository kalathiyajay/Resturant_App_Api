const dish = require('../models/dish.models');

exports.createDish = async (req, res) => {
    try {
        let { dishName, categoryId, description, price, dishImage, status, variant } = req.body

        let existDish = await dish.findOne({ dishName })

        if (existDish) {
            return res.status(404).json({ status: 404, success: false, message: "Dish Alredy exist..." })
        }

        if (!req.file) {
            return res.status(401).json({ status: 401, success: false, message: "DishImage File Is Require" })
        }

        existDish = await dish.create({
            dishName,
            categoryId,
            description,
            price,
            dishImage: req.file.path,
            status,
            variant
        })

        return res.status(201).json({ status: 201, success: true, message: "Dish Created SuccessFully...", data: existDish })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.getAllDish = async (req, res) => {
    try {
        let page = parseInt(req.query.page)
        let pageSize = parseInt(req.query.pageSize)

        if (page < 1 || pageSize < 1) {
            return res.status(401).json({ status: 401, success: false, message: "Page And PageSize Cann't Be Less Than 1" })
        }

        let paginatedDish;

        paginatedDish = await dish.find()

        let count = paginatedDish.length

        // if (count === 0) {
        //     return res.status(404).json({ status: 404, success: false, message: "Dish Not Found" })
        // }

        if (page && pageSize) {
            let startIndex = (page - 1) * pageSize
            let lastIndex = (startIndex + pageSize)
            paginatedDish = await paginatedDish.slice(startIndex, lastIndex)
        }

        return res.status(200).json({ status: 200, success: true, totalDish: count, message: "All Dish Found SuccessFully...", data: paginatedDish })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.getDishById = async (req, res) => {
    try {
        let id = req.params.id

        let getDishId = await dish.findById(id)

        if (!getDishId) {
            return res.status(404).json({ status: 404, success: false, message: "Dish Not Found" })
        }

        return res.status(200).json({ status: 200, success: true, message: "Dish Found SuccessFully...", data: getDishId });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.updateDishById = async (req, res) => {
    try {
        let id = req.params.id

        let updateDishId = await dish.findById(id)

        if (!updateDishId) {
            return res.status(404).json({ status: 404, success: false, message: "Dish Not Found" })
        }

        if (req.file) {
            req.body.dishImage = req.file.path
        }

        updateDishId = await dish.findByIdAndUpdate(id, { ...req.body }, { new: true })

        return res.status(200).json({ status: 200, success: true, message: "Dish Updated SuccessFully...", data: updateDishId });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.deleteDishById = async (req, res) => {
    try {
        let id = req.params.id

        let deleteDishId = await dish.findById(id)

        if (!deleteDishId) {
            return res.status(404).json({ status: 404, success: false, message: "Dish Not Found" })
        }

        await dish.findByIdAndDelete(id)

        return res.status(200).json({ status: 200, success: true, message: "Dish Delete SuccessFully..." })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}
