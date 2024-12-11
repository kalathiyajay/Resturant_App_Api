const user = require('../models/user.models')
const order = require('../models/order.models')

exports.createSuperAdmin = async (req, res) => {
    try {
        let { name, email, contact } = req.body

        let checkexistEmail = await user.findOne({ contact })

        if (checkexistEmail) {
            return res.status(409).json({ status: 409, success: false, message: "Mobile No Alredy exist" })
        }

        checkexistEmail = await user.findOne({ email })

        if (checkexistEmail) {
            return res.status(409).json({ status: 409, success: false, message: "Email Alredy exist" })
        }

        const imagePath = req.file ? req.file.path : undefined

        checkexistEmail = await user.create({
            name,
            email,
            contact,
            image: imagePath,
            role: 'Super Admin'
        })

        return res.status(201).json({ status: 201, success: true, message: "SuperAdmin Created SuccessFully...", data: checkexistEmail });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.createNewChef = async (req, res) => {
    try {
        let { name, email, contact } = req.body

        let checkexistEmail = await user.findOne({ contact })

        if (checkexistEmail) {
            return res.status(409).json({ status: 409, success: false, message: "Mobile No Alredy exist" })
        }

        checkexistEmail = await user.findOne({ email })

        if (checkexistEmail) {
            return res.status(409).json({ status: 409, success: false, message: "Email Alredy exist" })
        }

        const imagePath = req.file ? req.file.path : undefined

        checkexistEmail = await user.create({
            name,
            email,
            contact,
            image: imagePath,
            role: 'Chef'
        })

        return res.status(201).json({ status: 201, success: true, message: "Chef Created SuccessFully...", data: checkexistEmail });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.createNewWaiter = async (req, res) => {
    try {
        let { name, email, contact } = req.body

        let checkexistEmail = await user.findOne({ contact })

        if (checkexistEmail) {
            return res.status(409).json({ status: 409, success: false, message: "Mobile No Alredy exist" })
        }

        checkexistEmail = await user.findOne({ email })

        if (checkexistEmail) {
            return res.status(409).json({ status: 409, success: false, message: "Email Alredy exist" })
        }

        const imagePath = req.file ? req.file.path : undefined

        checkexistEmail = await user.create({
            name,
            email,
            contact,
            image: imagePath,
            role: 'Waiter'
        })

        return res.status(201).json({ status: 201, success: true, message: "Waiter Created SuccessFully...", data: checkexistEmail });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.createNewAccountant = async (req, res) => {
    try {
        let { name, email, contact } = req.body

        let checkexistEmail = await user.findOne({ contact })

        if (checkexistEmail) {
            return res.status(409).json({ status: 409, success: false, message: "Mobile No Alredy exist" })
        }

        checkexistEmail = await user.findOne({ email })

        if (checkexistEmail) {
            return res.status(409).json({ status: 409, success: false, message: "Email Alredy exist" })
        }

        const imagePath = req.file ? req.file.path : undefined

        checkexistEmail = await user.create({
            name,
            email,
            contact,
            image: imagePath,
            role: 'Accountant'
        })

        return res.status(201).json({ status: 201, success: true, message: "Accountant Created SuccessFully...", data: checkexistEmail });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.getAllUsers = async (req, res) => {
    try {
        let page = parseInt(req.query.page)
        let pageSize = parseInt(req.query.pageSize)

        if (page < 1 || pageSize < 1) {
            return res.status(401).json({ status: 401, success: false, message: "Page And PageSize Cann't Be Less Than 1" })
        }

        let paginatedUsers;

        paginatedUsers = await user.find()

        let count = paginatedUsers.length

        // if (count === 0) {
        //     return res.status(404).json({ status: 404, success: false, message: "User Not Found" })
        // }

        if (page && pageSize) {
            let startIndex = (page - 1) * pageSize
            let lastIndex = (startIndex + pageSize)
            paginatedUsers = await paginatedUsers.slice(startIndex, lastIndex)
        }

        return res.status(200).json({ status: 200, success: true, totalUsers: count, message: "All Users Found SuccessFully...", data: paginatedUsers });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.getUserById = async (req, res) => {
    try {
        let id = req.params.id

        let getUserId = await user.findById(id)

        if (!getUserId) {
            return res.status(404).json({ status: 404, success: false, message: "User Not Found" })
        }

        return res.status(200).json({ status: 200, success: true, message: "User Found SuccessFully...", data: getUserId });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.updateUserById = async (req, res) => {
    try {
        let id = req.params.id

        let updateUserId = await user.findById(id)

        if (!updateUserId) {
            return res.status(404).json({ status: 404, success: false, message: "User Not Found" })
        }

        if (req.file) {
            req.body.image = req.file.path
        }

        updateUserId = await user.findByIdAndUpdate(id, { ...req.body }, { new: true });

        return res.status(200).json({ status: 200, success: true, message: "User Updated SuccessFully...", data: updateUserId });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.deleteUserById = async (req, res) => {
    try {
        let id = req.params.id

        let deleteUserId = await user.findById(id)

        if (!deleteUserId) {
            return res.status(404).json({ status: 404, message: "User Not Found" })
        }

        await user.findByIdAndDelete(id)

        return res.status(200).json({ status: 200, success: true, message: "User Delete SuccessFully..." })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.dashBoard = async (req, res) => {
    try {
        const now = new Date();

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        let getAllOrder = await order.find({ createdAt: { $gte: startOfMonth, $lte: endOfMonth } });

        let totalRevune = await getAllOrder.reduce((sum, index) => {
            return sum + index.totalPrice
        }, 0)

        let allChef = await user.find({ role: 'Chef' })
        let allWaiter = await user.find({ role: 'Waiter' })

        let response = {
            TotalOrders: getAllOrder.length,
            TotalRevenue: totalRevune,
            TotalChef: allChef.length,
            TotalWaiter: allWaiter.length
        };

        return res.status(200).json({ status: 200, success: true, message: "DashBoard Data Found SuccessFully...", data: response });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}
