const user = require('../models/user.models')
const jwt = require('jsonwebtoken')
let otp = 1234

exports.loginContact = async (req, res) => {
    try {
        let { contact } = req.body

        let checkContact = await user.findOne({ contact })

        if (!checkContact) {
            return res.status(404).json({ status: 404, success: false, message: "Mobile No Not Found" })
        }

        checkContact.otp = otp

        await checkContact.save();

        return res.status(200).json({ status: 200, success: true, message: "Otp Sent SuccessFully..." })

    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.verifyOtp = async (req, res) => {
    try {
        let { contact, otp, fcmToken } = req.body

        let checkContact = await user.findOne({ contact })

        if (!checkContact) {
            return res.status(404).json({ status: 404, success: false, message: "Mobile No Not Found" })
        }

        if (checkContact.otp != otp) {
            return res.status(404).json({ status: 404, success: false, message: "Invalid Otp " })
        }

        checkContact.otp = undefined

        if (fcmToken) {
            checkContact.fcmToken = fcmToken;
        }

        await checkContact.save();

        let token = jwt.sign({ _id: checkContact._id }, process.env.SECRET_KEY, { expiresIn: '1D' });

        return res.status(200).json({ status: 200, success: true, role: checkContact.role, id: checkContact._id, message: "Login SuccessFully...", token: token });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.resendOtp = async (req, res) => {
    try {
        let { contact } = req.body

        let checkContact = await user.findOne({ contact })

        if (!checkContact) {
            return res.status(404).json({ status: 404, success: false, message: "Mobile No Not Found" })
        }

        checkContact.otp = 4567

        await checkContact.save();

        return res.status(200).json({ status: 200, success: true, message: "Otp Sent SuccessFully..." })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}