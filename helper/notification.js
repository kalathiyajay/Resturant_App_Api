const admin = require('firebase-admin');
const User = require('../models/user.models');

// exports.sendNotification = async (userType, message) => {
//     const tokens = await getUserTokens(userType); // Implement this function to get tokens

//     const payload = {
//         notification: {
//             title: 'Order Notification',
//             body: message
//         }
//     };

//     try {
//         await admin.messaging().sendToDevice(tokens, payload);
//     } catch (error) {
//         console.error('Error sending notification:', error);
//     }
// };
exports.sendNotification = async (userType, message) => {
    const tokens = await getUserTokens(userType);
    console.log('Tokens to send notification:', tokens); // Log tokens

    // Check if tokens are valid
    if (!Array.isArray(tokens) || tokens.length === 0) {
        console.warn('No valid tokens found for userType:', userType);
        return; // Exit if there are no valid tokens
    }

    const payload = {
        notification: {
            title: 'Order Notification',
            body: message
        }
    };

    try {
        console.log(`Sending notification to ${userType}:`, {
            tokens,
            message,
        });
        await admin.messaging().sendToDevice(tokens, payload);
        console.log('Notification sent successfully!');
    } catch (error) {
        console.error('Error sending notification:', error);
    }
};

// const getUserTokens = async (userType) => {
//     const users = await User.find({ role: userType });
//     const users.map(user => user.deviceToken).filter(token => token);
//     console.log('Retrieved tokens:', tokens); // Add this line
//     return tokens;
// };
const getUserTokens = async (userType) => {
    const users = await User.find({ role: userType });
    const tokens = users.map(user => user.deviceToken).filter(token => token);
    console.log('Retrieved tokens:', tokens); // Add this line
    return tokens;
};
