const category = require('../models/category.models');

exports.createCategory = async (req, res) => {
    try {
        let { categoryName, categoryImage } = req.body;

        let checkCategory = await category.findOne({ categoryName: categoryName })

        if (checkCategory) {
            return res.status(401).json({ status: 401, success: false, message: "Category Name Is Already exist..." })
        }

        if (!req.file) {
            return res.status(401).json({ status: 401, success: false, message: "Image file required" })
        }

        checkCategory = await category.create({
            categoryName,
            categoryImage: req.file.path
        });

        return res.status(201).json({ status: 201, success: true, message: "Category Is Created successFully...", data: checkCategory })

    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: 500, success: false, message: error.message });
    }
};

exports.getAllCategory = async (req, res) => {
    try {
        let page = parseInt(req.query.page);
        let pageSize = parseInt(req.query.pageSize);

        if (page < 1 || pageSize < 1) {
            return res.status(401).json({ status: 401, success: false, message: "Page And PageSize Can't Be Less Then 1" })
        }

        let paginatedCategory;

        paginatedCategory = await category.find();

        let count = paginatedCategory.length;

        // if (count === 0) {
        //     return res.status(404).json({ status: 404, success: false, message: "Category Not Found" })
        // }

        if (page && pageSize) {
            startIndex = (page - 1) * pageSize;
            lastIndex = (startIndex + pageSize)
            paginatedCategory = paginatedCategory.slice(startIndex, lastIndex)
        }

        return res.status(200).json({ status: 200, success: true, TotalCategorys: count, message: 'All Category Found Successfully..', data: paginatedCategory })

    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: 500, success: false, message: error.message });
    }
}

exports.getCategoryById = async (req, res) => {
    try {
        let id = req.params.id;

        let categoryById = await category.findById(id);

        if (!categoryById) {
            return res.status(404).json({ status: 404, success: false, message: "Category Not Found" })
        }

        res.status(200).json({ status: 200, success: true, message: "Category Found Successfully...", data: categoryById })

    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: 500, success: false, message: error.message });
    }
}

exports.updateCategory = async (req, res) => {
    try {
        let id = req.params.id;

        let checkCategoryId = await category.findById(id);

        if (!checkCategoryId) {
            return res.status(404).json({ status: 404, success: false, message: "Category Not Found" })
        }

        if (req.file) {
            req.body.categoryImage = req.file.path
        }

        checkCategoryId = await category.findByIdAndUpdate(id, { ...req.body }, { new: true });

        return res.status(200).json({ status: 200, success: true, message: "Category Updated Successfully...", data: checkCategoryId })

    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: 500, success: false, message: error.message });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        let id = req.params.id;

        let checkCategoryId = await category.findById(id);

        if (!checkCategoryId) {
            return res.status(404).json({ status: 404, success: false, message: "Category Not Found" })
        }

        await category.findByIdAndDelete(id);

        return res.status(200).json({ status: 200, success: true, message: "Category Delete Successfully..." })

    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: 500, success: false, message: error.message });
    }
}
