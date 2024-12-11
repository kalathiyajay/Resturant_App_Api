const order = require('../models/order.models')
const Variant = require('../models/variant.models')
const Dish = require('../models/dish.models')
const User = require('../models/user.models')
const admin = require('firebase-admin');
const Notification = require('../models/notificationModels')
const serviceAccount = require('../restaurant-app-service_account.json');
const Table = require('../models/table.models');
const orderNoTracker = require('../models/orderSequanceValue.models')

const generateOrderId = async () => {
    const currentPrefix = await orderNoTracker.findOne({}, {}, { sort: { 'prefix': -1 } });

    let prefix = currentPrefix ? currentPrefix.prefix : 'AA';
    let orderId = currentPrefix ? currentPrefix.lastSequenceNumber + 1 : 1;

    const incrementPrefix = (prefix) => {
        let first = prefix.charCodeAt(0);
        let second = prefix.charCodeAt(1);

        if (second < 90) {
            second++;
        } else {
            second = 65;
            if (first < 90) {
                first++;
            } else {
                throw new Error('Maximum prefix reached');
            }
        }

        return String.fromCharCode(first) + String.fromCharCode(second);
    };

    if (orderId > 999999999) {
        prefix = incrementPrefix(prefix);
        orderId = 1;
    }

    let prefixData = await orderNoTracker.findOne({ prefix });

    if (!prefixData) {
        prefixData = await orderNoTracker.create({ prefix, lastSequenceNumber: 0 });
    }

    await orderNoTracker.updateOne({ prefix }, { lastSequenceNumber: orderId });

    const number = String(orderId).padStart(9, '0');

    return prefix + number;
};


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


async function sendNotificationToFirebase(tokens, title, body) {
    const message = {
        notification: {
            title,
            body,
        },
        tokens: tokens
    };

    try {
        const response = await admin.messaging().sendMulticast(message);
        console.log('Notifications sent successfully:', response);
    } catch (error) {
        console.error('Error sending notifications:', error);
    }
}

exports.createOrder = async (req, res) => {
    try {
        let { table, items,orderId } = req.body
        let totalPrice = 0

        if (!orderId) {
            orderId = await generateOrderId();
        }

        let checkTableId = await Table.findById(table)

        if (!checkTableId) {
            return res.status(404).json({ status: 404, success: false, message: "Table Not Found" })
        }

        const processedItems = [];
        for (const item of items) {
            const getDishData = await Dish.findById(item.dish)
            if (getDishData) {
                itemPrice = getDishData.price * item.quantity
            }
            else {
                return res.status(404).json({ status: 404, success: false, message: "Dish Not Found" })
            }
            if (item.variant) {
                let variantData = await Variant.findById(item.variant);
                if (!variantData) {
                    return res.status(404).json({ status: 404, message: "Variant Not Found" })
                }
                itemPrice += variantData.price
            }
            processedItems.push({
                dish: item.dish,
                variant: item.variant,
                quantity: item.quantity,
                addInstruction:item.addInstruction
            });
            totalPrice += itemPrice
        }


        let existOrder = await order.create({
            table,
            orderId,
            items: processedItems,
            totalPrice
        });

        checkTableId.status = 'Not available';
        
        await checkTableId.save();

        const chefs = await User.find({ role: 'Chef' });

        const chefTokens = chefs
            .filter(chef => chef.fcmToken && chef.fcmToken.trim() !== '')

            .map(chef => chef.fcmToken);

        if (chefTokens.length > 0) {
            await sendNotificationToFirebase(
                chefTokens,
                'New Order',
                `Order #${orderId} has been created.`
            );
        }

        await Notification.create({
            message: `New order created with ID: ${orderId}`
        });

        return res.status(201).json({ status: 201, success: true, message: "Order Created Successfully.", data: existOrder });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.getAllOrders = async (req, res) => {
    try {
        let page = parseInt(req.query.page)
        let pageSize = parseInt(req.query.pageSize)

        if (page < 1 || pageSize < 1) {
            return res.status(401).json({ status: 401, success: false, message: "Page And PageSize Cann't Be Less Than 1" })
        }

        let paginatedOrders;

        paginatedOrders = await order.find().sort({createdAt:-1}).populate('table', 'tableName').populate('items.dish').populate('items.variant')

        let count = paginatedOrders.length

        // if (count === 0) {
        //     return res.status(404).json({ status: 404, success: false, message: "Order Not Found" })
        // }

        if (page && pageSize) {
            let startIndex = (page - 1) * pageSize;
            let lastIndex = (startIndex + pageSize)
            paginatedOrders = await paginatedOrders.slice(startIndex, lastIndex)
        }

        return res.status(200).json({ status: 200, success: true, totalOrders: count, message: "All Orders Found SuccessFully...", data: paginatedOrders });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.getOrderById = async (req, res) => {
    try {
        let id = req.params.id

        let getOrderId = await order.findById(id).populate('table', 'tableName').populate('items.dish').populate('items.variant')

        if (!getOrderId) {
            return res.status(404).json({ status: 404, success: false, message: "Order Not Found" })
        }

        return res.status(200).json({ status: 200, success: true, message: "Order Found SuccessFully...", data: getOrderId });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.updateOrderStatusById = async (req, res) => {
    try {
        const itemId = req.params.id;
        const { status } = req.body;

        const existingOrder = await order.findOne({'items._id': itemId});

        if (!existingOrder) {
            return res.status(404).json({ status: 404, success: false, message: "Item not found in any order"});
        }

        const itemToUpdate = existingOrder.items.id(itemId);

        if (!itemToUpdate) {
            return res.status(404).json({ status: 404, success: false, message: "Item not found in the order"});
        }

        itemToUpdate.status = status;

        await existingOrder.save();

        const waiters = await User.find({ role: 'Waiter' });

        const waiterFCMTokens = waiters
            .map(waiter => waiter.fcmToken)
            .filter(token => token && token.trim() !== '');

        if (waiterFCMTokens.length > 0) {
            await sendNotificationToFirebase(
                waiterFCMTokens,
                `Order ${itemToUpdate.status}`,
                `Order ${existingOrder.orderId} has been ${itemToUpdate.status.toLowerCase()}.`
            );
        }

        await Notification.create({
            message: `Order ${existingOrder.orderId} has been ${itemToUpdate.status.toLowerCase()}`,
        });

        return res.status(200).json({ status: 200, success: true, message: "Order item status updated successfully", data: existingOrder});

    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: 500, success: false, message: error.message });
    }
}

exports.updateOrderById = async (req, res) => {
    try {
        const id = req.params.id;
        const { items } = req.body;

        const Order = await order.findById(id);
        if (!Order) {
            return res.status(404).json({ status: 404, success: false, message: 'Order not found' });
        }

        if (items && Array.isArray(items)) {
            for (const item of items) {
                const dish = await Dish.findById(item.dish);
                if (!dish) {
                    return res.status(400).json({ success: false, message: `Dish not found` });
                }

                if (item.variant) {
                    const variant = await Variant.findById(item.variant);
                    if (!variant) {
                        return res.status(400).json({ success: false, message: `Variant not found` });
                    }
                }

                const newItem = {
                    dish: item.dish,
                    variant: item.variant,
                    quantity: item.quantity,
                    addInstruction:item.addInstruction,
                    status: 'Pending'
                };

                Order.items.push(newItem);
            }
        }
        
        let totalPrice = 0;

        for (const item of Order.items) {
            const dish = await Dish.findById(item.dish);
            let itemTotal = dish.price * item.quantity

            if (item.variant) {
                const variant = await Variant.findById(item.variant);
                if (variant && variant.price) {
                    itemTotal += variant.price;
                }
            }

            totalPrice += itemTotal;
        }

        Order.totalPrice = totalPrice;

        const updatedOrder = await Order.save();

        const populatedOrder = await order.findById(updatedOrder._id)

        return res.status(200).json({ status: 200, success: true, message: 'Order updated successfully', data: populatedOrder });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: 500, success: false, error: error.message });
    }

}

exports.deleteOrderById = async (req, res) => {
    try {
        let id = req.params.id

        let deleteOrderId = await order.findById(id)

        if (!deleteOrderId) {
            return res.status(404).json({ status: 404, success: false, message: "Order Not Found" })
        }

        await order.findByIdAndDelete(id)

        return res.status(200).json({ status: 200, success: true, message: "Order Delete SuccessFully...." })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, success: false, message: error.message })
    }
}

exports.deleteOrderItem = async (req, res) => {
    try {
        const itemId = req.params.id;

        if (!itemId) {
            return res.status(400).json({ status: 400, success: false, message: 'itemId is required' });
        }

        const updatedOrder = await order.findOneAndUpdate( { 'items._id': itemId },{ $pull: { items: { _id: itemId } } },{ new: true } );

        if (!updatedOrder) {
            return res.status(404).json({ status: 404, success: false, message: 'Item not found in any order' });
        }

        return res.status(200).json({ status: 200, success: true, message: 'Item removed successfully' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 500, success: false, message: error.message });
    }
};

exports.updateOrderItemQuantity = async (req, res) => {
    try {
        const itemId = req.params.id;
        const { quantity } = req.body;

        const Order = await order.findOne({ 'items._id': itemId });
        
        if (!Order) {
            return res.status(404).json({ status: 404, message: 'Order not found' });
        }

        const item = Order.items.id(itemId);

        if (!item) {
            return res.status(404).json({ status: 404, message: 'Item not found in the order' });
        }

        if (quantity !== undefined) {
            item.quantity = quantity;
        }

        await Order.save();

        return res.status(200).json({ status: 200, success: true, message: "Order Item Quantity Updated Successfully...", data: Order });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 500, message: error.message });
    } 
}

// --------------------------------------------------------------------------

// exports.createOrder = async (req, res) => {
//     try {
//         let { table, variant, items, totalPrice = 0 } = req.body

//         let variantPrice = 0;
//         let checkTableId = await Table.findById(table)
//         if (variant) {
//             const getVariantData = await Variant.findById(variant)
//             if (getVariantData) {
//                 variantPrice = getVariantData.price
//             }
//         }

//         for (const item of items) {
//             const getDishData = await Dish.findById(item.dish)
//             if (getDishData) {
//                 totalPrice += getDishData.price * item.quantity
//             }
//             else {
//                 return res.status(404).json({ status: 404, success: false, message: "Dish Not Found" })
//             }
//         }

//         totalPrice += variantPrice;

//         let existOrder = await order.create({
//             table,
//             variant,
//             items,
//             totalPrice
//         });

//         const chefs = await User.find({ role: 'Chef' });
//         const chefTokens = chefs
//             .filter(chef => chef.fcmToken && chef.fcmToken.trim() !== '')

//             .map(chef => chef.fcmToken);

//         if (chefTokens.length > 0) {
//             await sendNotificationToFirebase(
//                 chefTokens,
//                 'New Order',
//                 `Order #${existOrder._id} has been created.`
//             );
//         }

//         await Notification.create({
//             message: `New order created with ID: ${existOrder._id}`
//         });

//         checkTableId.status = 'Not available';

//         await checkTableId.save();

//         return res.status(201).json({ status: 201, success: true, message: "Order Created Successfully.", data: existOrder });

//     } catch (error) {
//         console.log(error)
//         return res.status(500).json({ status: 500, success: false, message: error.message })
//     }
// }
// ----------------------
// const allServed = existingOrder.items.every(item => item.status === 'Served');

        // if (allServed) {
        //     existingOrder.status = 'Served';
        // }

        // else if (existingOrder.items.some(item => item.status === 'Preparing')) {
        //     existingOrder.status = 'Preparing';
        // }

        
        // if (status === 'Served') {
        //     const waiters = await User.find({
        //         role: 'Waiter',
        //         fcmToken: { $exists: true, $ne: '' }
        //     });

        //     const waiterTokens = waiters.map(waiter => waiter.fcmToken);

        //     if (waiterTokens.length > 0) {
        //         await sendNotificationToFirebase(
        //             waiterTokens,
        //             'Item Ready to Serve',
        //             `Item from Order #${existingOrder._id} is ready to be served.`
        //         );
        //     }

        //     await Notification.create({
        //         message: `Item from Order #${existingOrder._id} is ready to be served.`
        //     });
        // }
// --------------
// try {
//     let id = req.params.id;
//     let { orderStatus } = req.body;

//     let updateOrdersStatusId = await order.findById(id);

//     if (!updateOrdersStatusId) {
//         return res.status(404).json({ status: 404, success: false, message: "Order Not Found" });
//     }

//     if (orderStatus === 'Accept') {
//         updateOrdersStatusId.status = 'Preparing';
//     } else {
//         updateOrdersStatusId.status = 'Canceled';
//     }

//     await updateOrdersStatusId.save();

//     const waiters = await User.find({ role: 'Waiter' });
//     const waiterFCMTokens = waiters
//         .map(waiter => waiter.fcmToken)
//         .filter(token => token && token.trim() !== '');

//     if (waiterFCMTokens.length > 0) {
//         await sendNotificationToFirebase(
//             waiterFCMTokens,
//             `Order ${updateOrdersStatusId.status}`,
//             `Order #${id} has been ${updateOrdersStatusId.status.toLowerCase()}.`
//         );
//     }

//     await Notification.create({
//         message: `Order ${id} has been ${updateOrdersStatusId.status.toLowerCase()}`,
//         createdAt: new Date()
//     });

//     return res.status(200).json({
//         status: 200,
//         success: true,
//         message: "Order Status Updated Successfully.",
//         data: updateOrdersStatusId
//     });

// } catch (error) {
//     console.log(error);
//     return res.status(500).json({ status: 500, success: false, message: error.message });
// }
// try {
//     const id = req.params.id;  // Order ID from the URL
//     const { items } = req.body;  // New table and item details to update

//     // Find the existing order by ID
//     let orderToUpdate = await order.findById(id);
//     console.log(orderToUpdate);
//     if (!orderToUpdate) {
//         return res.status(404).json({ status: 404, success: false, message: "Order Not Found" });
//     }

//     let totalPrice = 0;  // This will hold the updated total price for the order

//     // Iterate through the items to update the individual item details
//     for (const updatedItem of items) {
//         // Find the dish related to the updated item
//         const dishData = await Dish.findById(updatedItem.dish);
//         if (!dishData) {
//             return res.status(404).json({ status: 404, success: false, message: "Dish Not Found" });
//         }
//         console.log(updatedItem);
//         // Find the variant related to the updated item
//         let variantPrice = 0;
//         if (updatedItem.variant) {
//             const variantData = await Variant.findById(updatedItem.variant);
//             if (variantData) {
//                 variantPrice = variantData.price;  // Get the variant price if it's specified
//             }
//         }

//         // Update the item's price (dish price * quantity + variant price if applicable)
//         const itemTotalPrice = (dishData.price * updatedItem.quantity) + variantPrice;

//         // Find the index of the item in the existing order to update it
//         const itemIndex = orderToUpdate.items.findIndex(item => {
//             // Ensure item._id is valid before comparing
//             if (item._id && updatedItem._id) {
//                 return item._id.toString() === updatedItem._id.toString();
//             }
//             return false;
//         });
//         if (itemIndex !== -1) {
//             // Update the item in the order at the specified index
//             orderToUpdate.items[itemIndex] = {
//                 ...orderToUpdate.items[itemIndex],
//                 ...updatedItem,  // Spread the updated values from the request
//                 price: itemTotalPrice  // Update the price for this item
//             };
//         } else {
//             return res.status(404).json({ status: 404, success: false, message: "Item Not Found in Order" });
//         }

//         // Add the item total to the order's overall total price
//         totalPrice += itemTotalPrice;
//     }

//     // Update the table if provided (otherwise keep the old one)
//     if (table) {
//         orderToUpdate.table = table;
//     }

//     // Update the total price of the order
//     orderToUpdate.totalPrice = totalPrice;

//     // Save the updated order
//     await orderToUpdate.save();

//     return res.status(200).json({
//         status: 200,
//         success: true,
//         message: "Order Updated Successfully",
//         data: orderToUpdate
//     });

// } catch (error) {
//     console.error(error);
//     return res.status(500).json({ status: 500, success: false, message: error.message });
// }
// try {
//     let id = req.params.id

//     let { table, variant, items } = req.body;

//     let updateOrderId = await order.findById(id)

//     if (!updateOrderId) {
//         return res.status(404).json({ status: 404, success: false, message: "Order Not Found" })
//     }

//     let variantPrice = 0;
//     let totalPrice = 0;

//     if (variant) {
//         const getVariantData = await Variant.findById(variant);
//         if (getVariantData) {
//             variantPrice = getVariantData.price;
//         }
//     }

//     for (const item of items) {
//         const getDishData = await Dish.findById(item.dish);
//         if (getDishData) {
//             totalPrice += getDishData.price * item.quantity;
//         } else {
//             return res.status(404).json({ status: 404, success: false, message: "Dish Not Found" });
//         }
//     }

//     totalPrice += variantPrice;

//     updateOrderId = await order.findByIdAndUpdate(id, {
//         table,
//         variant,
//         items,
//         totalPrice
//     }, { new: true });

//     return res.status(200).json({ status: 200, success: true, message: "Order Update SuccessFully...", data: updateOrderId });

// } catch (error) {
//     console.log(error)
//     return res.status(500).json({ status: 500, success: false, message: error.message })
// }

// --------------------------------------------------------------------------

// const order = require('../models/order.models')
// const Variant = require('../models/variant.models')
// const Dish = require('../models/dish.models')
// const { sendNotification } = require('../helper/notification')

// exports.createOrder = async (req, res) => {
//     try {
//         let { table, variant, items, totalPrice = 0 } = req.body

//         let variantPrice = 0;

//         if (variant) {
//             const getVariantData = await Variant.findById(variant)
//             if (getVariantData) {
//                 variantPrice = getVariantData.price
//             }
//         }

//         for (const item of items) {
//             const getDishData = await Dish.findById(item.dish)
//             if (getDishData) {
//                 totalPrice += getDishData.price * item.quantity
//             }
//             else {
//                 return res.status(404).json({ status: 404, success: false, message: "Dish Not Found" })
//             }
//         }

//         totalPrice += variantPrice;

//         let existOrder = await order.create({
//             table,
//             variant,
//             items,
//             totalPrice
//         });

//         const notificationMessage = `New order created with ID: ${existOrder._id}`;
//         await sendNotification('Waiter', notificationMessage);
//         await sendNotification('Chef', notificationMessage);

//         return res.status(201).json({ status: 201, success: true, message: "Order Created SuccessFully....", data: existOrder });

//     } catch (error) {
//         console.log(error)
//         return res.status(500).json({ status: 500, success: false, message: error.message })
//     }
// }

// exports.getAllOrders = async (req, res) => {
//     try {
//         let page = parseInt(req.query.page)
//         let pageSize = parseInt(req.query.pageSize)

//         if (page < 1 || pageSize < 1) {
//             return res.status(401).json({ status: 401, success: false, message: "Page And PageSize Cann't Be Less Than 1" })
//         }

//         let paginatedOrders;

//         paginatedOrders = await order.find()

//         let count = paginatedOrders.length

//         if (count === 0) {
//             return res.status(404).json({ status: 404, success: false, message: "Order Not Found" })
//         }

//         if (page && pageSize) {
//             let startIndex = (page - 1) * pageSize;
//             let lastIndex = (startIndex + pageSize)
//             paginatedOrders = await paginatedOrders.slice(startIndex, lastIndex)
//         }

//         return res.status(200).json({ status: 200, success: true, totalOrders: count, message: "All Orders Found SuccessFully...", data: paginatedOrders });

//     } catch (error) {
//         console.log(error)
//         return res.status(500).json({ status: 500, success: false, message: error.message })
//     }
// }

// exports.getOrderById = async (req, res) => {
//     try {
//         let id = req.params.id

//         let getOrderId = await order.findById(id)

//         if (!getOrderId) {
//             return res.status(404).json({ status: 404, success: false, message: "Order Not Found" })
//         }

//         return res.status(200).json({ status: 200, success: true, message: "Order Found SuccessFully...", data: getOrderId });

//     } catch (error) {
//         console.log(error)
//         return res.status(500).json({ status: 500, success: false, message: error.message })
//     }
// }

// exports.updateOrderStatusById = async (req, res) => {
//     try {
//         let id = req.params.id

//         let { orderStatus } = req.body

//         let updateOrdersStatusId = await order.findById(id)

//         if (!updateOrdersStatusId) {
//             return res.status(404).json({ status: 404, success: false, message: "Order Not Found" })
//         }

//         if (orderStatus === 'Accept') {
//             updateOrdersStatusId.status = 'Preparing'
//         } else {
//             updateOrdersStatusId.status = 'Canceled'
//         }

//         await updateOrdersStatusId.save();
//         const notificationMessage = `Order ${id} has been ${updateOrdersStatusId.status.toLowerCase()}`;

//         // Send notifications
//         await sendNotification('Chef', notificationMessage);
//         if (updateOrdersStatusId.status === 'Preparing') {
//             await sendNotification('Waiter', notificationMessage);
//         }


//         return res.status(200).json({ status: 200, success: true, message: "Order Status Updated SuccessFully...", data: updateOrdersStatusId });

//     } catch (error) {
//         console.log(error)
//         return res.status(500).json({ status: 500, success: false, message: error.message })
//     }
// }

// exports.updateOrderById = async (req, res) => {
//     try {
//         let id = req.params.id

//         let { table, variant, items } = req.body;

//         let updateOrderId = await order.findById(id)

//         if (!updateOrderId) {
//             return res.status(404).json({ status: 404, success: false, message: "Order Not Found" })
//         }

//         let variantPrice = 0;
//         let totalPrice = 0;

//         if (variant) {
//             const getVariantData = await Variant.findById(variant);
//             if (getVariantData) {
//                 variantPrice = getVariantData.price;
//             }
//         }

//         for (const item of items) {
//             const getDishData = await Dish.findById(item.dish);
//             if (getDishData) {
//                 totalPrice += getDishData.price * item.quantity;
//             } else {
//                 return res.status(404).json({ status: 404, success: false, message: "Dish Not Found" });
//             }
//         }

//         totalPrice += variantPrice;

//         updateOrderId = await order.findByIdAndUpdate(id, {
//             table,
//             variant,
//             items,
//             totalPrice
//         }, { new: true });

//         return res.status(200).json({ status: 200, success: true, message: "Order Update SuccessFully...", data: updateOrderId });

//     } catch (error) {
//         console.log(error)
//         return res.status(500).json({ status: 500, success: false, message: error.message })
//     }
// }

// exports.deleteOrderById = async (req, res) => {
//     try {
//         let id = req.params.id

//         let deleteOrderId = await order.findById(id)

//         if (!deleteOrderId) {
//             return res.status(404).json({ status: 404, success: false, message: "Order Not Found" })
//         }

//         await order.findByIdAndDelete(id)

//         return res.status(200).json({ status: 200, success: true, message: "Order Delete SuccessFully...." })

//     } catch (error) {
//         console.log(error)
//         return res.status(500).json({ status: 500, success: false, message: error.message })
//     }
// }


// -- old


// const order = require('../models/order.models')
// const Variant = require('../models/variant.models')
// const Dish = require('../models/dish.models')
// const admin = require('firebase-admin');
// const User = require('../models/user.models')

// exports.createOrder = async (req, res) => {
//     try {
//         let { table, variant, items, totalPrice = 0 } = req.body

//         let variantPrice = 0;

//         if (variant) {
//             const getVariantData = await Variant.findById(variant)
//             if (getVariantData) {
//                 variantPrice = getVariantData.price
//             }
//         }

//         for (const item of items) {
//             const getDishData = await Dish.findById(item.dish)
//             if (getDishData) {
//                 totalPrice += getDishData.price * item.quantity
//             }
//             else {
//                 return res.status(404).json({ status: 404, success: false, message: "Dish Not Found" })
//             }
//         }

//         totalPrice += variantPrice;

//         let existOrder = await order.create({
//             table,
//             variant,
//             items,
//             totalPrice
//         });

//         // const chefs = await User.find({ role: 'Chef' });
//         // const chefTokens = chefs.map(chef => chef.deviceToken).filter(token => token);

//         const chefTokens = chefs
//             .filter(chef => chef.fcmToken && chef.fcmToken.trim() !== '')
//             .map(chef => chef.fcmToken);

//         if (chefTokens.length > 0) {
//             const message = {
//                 notification: {
//                     title: 'New Order',
//                     body: `Order #${existOrder._id} has been created.`
//                 },
//                 tokens: chefTokens
//             };
//             console.log("Message", message);
//             try {
//                 // await admin.messaging().sendMulticast(message);
//                 // console.log('Notifications sent successfully to chefs');
//                 const response = await admin.messaging().sendMulticast(message);
//                 console.log('Notifications sent successfully to chefs:', response);
//             } catch (error) {
//                 console.error('Error sending notifications:', error);
//             }
//         } else {
//             console.log('No valid chef FCM tokens found. Skipping notification.');
//         }

//         return res.status(201).json({ status: 201, success: true, message: "Order Created SuccessFully....", data: existOrder });

//     } catch (error) {
//         console.log(error)
//         return res.status(500).json({ status: 500, success: false, message: error.message })
//     }
// }

// exports.getAllOrders = async (req, res) => {
//     try {
//         let page = parseInt(req.query.page)
//         let pageSize = parseInt(req.query.pageSize)

//         if (page < 1 || pageSize < 1) {
//             return res.status(401).json({ status: 401, success: false, message: "Page And PageSize Cann't Be Less Than 1" })
//         }

//         let paginatedOrders;

//         paginatedOrders = await order.find()

//         let count = paginatedOrders.length

//         if (count === 0) {
//             return res.status(404).json({ status: 404, success: false, message: "Order Not Found" })
//         }

//         if (page && pageSize) {
//             let startIndex = (page - 1) * pageSize;
//             let lastIndex = (startIndex + pageSize)
//             paginatedOrders = await paginatedOrders.slice(startIndex, lastIndex)
//         }

//         return res.status(200).json({ status: 200, success: true, totalOrders: count, message: "All Orders Found SuccessFully...", data: paginatedOrders });

//     } catch (error) {
//         console.log(error)
//         return res.status(500).json({ status: 500, success: false, message: error.message })
//     }
// }

// exports.getOrderById = async (req, res) => {
//     try {
//         let id = req.params.id

//         let getOrderId = await order.findById(id)

//         if (!getOrderId) {
//             return res.status(404).json({ status: 404, success: false, message: "Order Not Found" })
//         }

//         return res.status(200).json({ status: 200, success: true, message: "Order Found SuccessFully...", data: getOrderId });

//     } catch (error) {
//         console.log(error)
//         return res.status(500).json({ status: 500, success: false, message: error.message })
//     }
// }

// exports.updateOrderStatusById = async (req, res) => {
//     try {
//         let id = req.params.id;
//         let { orderStatus } = req.body;

//         let updateOrdersStatusId = await order.findById(id);

//         if (!updateOrdersStatusId) {
//             return res.status(404).json({ status: 404, success: false, message: "Order Not Found" });
//         }

//         if (orderStatus === 'Accept') {
//             updateOrdersStatusId.status = 'Preparing';
//         } else {
//             updateOrdersStatusId.status = 'Canceled';
//         }

//         await updateOrdersStatusId.save();

//         const waiters = await User.find({ role: 'Waiter' });
//         const waiterFCMTokens = waiters
//             .map(waiter => waiter.fcmToken)
//             .filter(token => token && token.trim() !== '');

//         if (waiterFCMTokens.length > 0) {
//             const message = {
//                 notification: {
//                     title: `Order ${updateOrdersStatusId.status}`,
//                     body: `Order #${id} has been ${updateOrdersStatusId.status.toLowerCase()}.`
//                 },
//                 tokens: waiterFCMTokens
//             };

//             console.log("Sending notification to waiters:", message);

//             try {
//                 const response = await admin.messaging().sendMulticast(message);
//                 console.log('Notifications sent successfully to waiters:', response);
//             } catch (error) {
//                 console.error('Error sending notifications:', error);
//             }
//         } else {
//             console.log('No valid waiter FCM tokens found. Skipping notification.');
//         }

//         return res.status(200).json({
//             status: 200,
//             success: true,
//             message: "Order Status Updated Successfully.",
//             data: updateOrdersStatusId
//         });

//     } catch (error) {
//         console.log(error);
//         return res.status(500).json({ status: 500, success: false, message: error.message });
//     }
// }

// // exports.updateOrderStatusById = async (req, res) => {
// //     try {
// //         let id = req.params.id

// //         let { orderStatus } = req.body

// //         let updateOrdersStatusId = await order.findById(id)

// //         if (!updateOrdersStatusId) {
// //             return res.status(404).json({ status: 404, success: false, message: "Order Not Found" })
// //         }

// //         if (orderStatus === 'Accept') {
// //             updateOrdersStatusId.status = 'Preparing'
// //         } else {
// //             updateOrdersStatusId.status = 'Canceled'
// //         }

// //         await updateOrdersStatusId.save();

// //         const waiters = await User.find({ role: 'Waiter' });
// //         const waiterTokens = waiters.map(waiter => waiter.deviceToken).filter(token => token);

// //         if (waiterTokens.length > 0) {
// //             const message = {
// //                 notification: {
// //                     title: `Order ${updateOrdersStatusId.status}`,
// //                     body: `Order Id${id} has been ${updateOrdersStatusId.status.toLowerCase()}.`
// //                 },
// //                 tokens: waiterTokens
// //             };
// //             console.log("Message", message);
// //             try {
// //                 await admin.messaging().sendMulticast(message);
// //                 console.log('Notifications sent successfully to waiters');
// //             } catch (error) {
// //                 console.error('Error sending notifications:', error);
// //             }
// //         }

// //         return res.status(200).json({ status: 200, success: true, message: "Order Status Updated SuccessFully...", data: updateOrdersStatusId });

// //     } catch (error) {
// //         console.log(error)
// //         return res.status(500).json({ status: 500, success: false, message: error.message })
// //     }
// // }

// exports.updateOrderById = async (req, res) => {
//     try {
//         let id = req.params.id

//         let { table, variant, items } = req.body;

//         let updateOrderId = await order.findById(id)

//         if (!updateOrderId) {
//             return res.status(404).json({ status: 404, success: false, message: "Order Not Found" })
//         }

//         let variantPrice = 0;
//         let totalPrice = 0;

//         if (variant) {
//             const getVariantData = await Variant.findById(variant);
//             if (getVariantData) {
//                 variantPrice = getVariantData.price;
//             }
//         }

//         for (const item of items) {
//             const getDishData = await Dish.findById(item.dish);
//             if (getDishData) {
//                 totalPrice += getDishData.price * item.quantity;
//             } else {
//                 return res.status(404).json({ status: 404, success: false, message: "Dish Not Found" });
//             }
//         }

//         totalPrice += variantPrice;

//         updateOrderId = await order.findByIdAndUpdate(id, {
//             table,
//             variant,
//             items,
//             totalPrice
//         }, { new: true });

//         return res.status(200).json({ status: 200, success: true, message: "Order Update SuccessFully...", data: updateOrderId });

//     } catch (error) {
//         console.log(error)
//         return res.status(500).json({ status: 500, success: false, message: error.message })
//     }
// }

// exports.deleteOrderById = async (req, res) => {
//     try {
//         let id = req.params.id

//         let deleteOrderId = await order.findById(id)

//         if (!deleteOrderId) {
//             return res.status(404).json({ status: 404, success: false, message: "Order Not Found" })
//         }

//         await order.findByIdAndDelete(id)

//         return res.status(200).json({ status: 200, success: true, message: "Order Delete SuccessFully...." })

//     } catch (error) {
//         console.log(error)
//         return res.status(500).json({ status: 500, success: false, message: error.message })
//     }
// }




// const order = require('../models/order.models')
// const Variant = require('../models/variant.models')
// const Dish = require('../models/dish.models')
// const { sendNotification } = require('../helper/notification')

// exports.createOrder = async (req, res) => {
//     try {
//         let { table, variant, items, totalPrice = 0 } = req.body

//         let variantPrice = 0;

//         if (variant) {
//             const getVariantData = await Variant.findById(variant)
//             if (getVariantData) {
//                 variantPrice = getVariantData.price
//             }
//         }

//         for (const item of items) {
//             const getDishData = await Dish.findById(item.dish)
//             if (getDishData) {
//                 totalPrice += getDishData.price * item.quantity
//             }
//             else {
//                 return res.status(404).json({ status: 404, success: false, message: "Dish Not Found" })
//             }
//         }

//         totalPrice += variantPrice;

//         let existOrder = await order.create({
//             table,
//             variant,
//             items,
//             totalPrice
//         });

//         const notificationMessage = `New order created with ID: ${existOrder._id}`;
//         await sendNotification('Waiter', notificationMessage);
//         await sendNotification('Chef', notificationMessage);

//         return res.status(201).json({ status: 201, success: true, message: "Order Created SuccessFully....", data: existOrder });

//     } catch (error) {
//         console.log(error)
//         return res.status(500).json({ status: 500, success: false, message: error.message })
//     }
// }

// exports.getAllOrders = async (req, res) => {
//     try {
//         let page = parseInt(req.query.page)
//         let pageSize = parseInt(req.query.pageSize)

//         if (page < 1 || pageSize < 1) {
//             return res.status(401).json({ status: 401, success: false, message: "Page And PageSize Cann't Be Less Than 1" })
//         }

//         let paginatedOrders;

//         paginatedOrders = await order.find()

//         let count = paginatedOrders.length

//         if (count === 0) {
//             return res.status(404).json({ status: 404, success: false, message: "Order Not Found" })
//         }

//         if (page && pageSize) {
//             let startIndex = (page - 1) * pageSize;
//             let lastIndex = (startIndex + pageSize)
//             paginatedOrders = await paginatedOrders.slice(startIndex, lastIndex)
//         }

//         return res.status(200).json({ status: 200, success: true, totalOrders: count, message: "All Orders Found SuccessFully...", data: paginatedOrders });

//     } catch (error) {
//         console.log(error)
//         return res.status(500).json({ status: 500, success: false, message: error.message })
//     }
// }

// exports.getOrderById = async (req, res) => {
//     try {
//         let id = req.params.id

//         let getOrderId = await order.findById(id)

//         if (!getOrderId) {
//             return res.status(404).json({ status: 404, success: false, message: "Order Not Found" })
//         }

//         return res.status(200).json({ status: 200, success: true, message: "Order Found SuccessFully...", data: getOrderId });

//     } catch (error) {
//         console.log(error)
//         return res.status(500).json({ status: 500, success: false, message: error.message })
//     }
// }

// exports.updateOrderStatusById = async (req, res) => {
//     try {
//         let id = req.params.id

//         let { orderStatus } = req.body

//         let updateOrdersStatusId = await order.findById(id)

//         if (!updateOrdersStatusId) {
//             return res.status(404).json({ status: 404, success: false, message: "Order Not Found" })
//         }

//         if (orderStatus === 'Accept') {
//             updateOrdersStatusId.status = 'Preparing'
//         } else {
//             updateOrdersStatusId.status = 'Canceled'
//         }

//         await updateOrdersStatusId.save();
//         const notificationMessage = `Order ${id} has been ${updateOrdersStatusId.status.toLowerCase()}`;

//         // Send notifications
//         await sendNotification('Chef', notificationMessage);
//         if (updateOrdersStatusId.status === 'Preparing') {
//             await sendNotification('Waiter', notificationMessage);
//         }


//         return res.status(200).json({ status: 200, success: true, message: "Order Status Updated SuccessFully...", data: updateOrdersStatusId });

//     } catch (error) {
//         console.log(error)
//         return res.status(500).json({ status: 500, success: false, message: error.message })
//     }
// }

// exports.updateOrderById = async (req, res) => {
//     try {
//         let id = req.params.id

//         let { table, variant, items } = req.body;

//         let updateOrderId = await order.findById(id)

//         if (!updateOrderId) {
//             return res.status(404).json({ status: 404, success: false, message: "Order Not Found" })
//         }

//         let variantPrice = 0;
//         let totalPrice = 0;

//         if (variant) {
//             const getVariantData = await Variant.findById(variant);
//             if (getVariantData) {
//                 variantPrice = getVariantData.price;
//             }
//         }

//         for (const item of items) {
//             const getDishData = await Dish.findById(item.dish);
//             if (getDishData) {
//                 totalPrice += getDishData.price * item.quantity;
//             } else {
//                 return res.status(404).json({ status: 404, success: false, message: "Dish Not Found" });
//             }
//         }

//         totalPrice += variantPrice;

//         updateOrderId = await order.findByIdAndUpdate(id, {
//             table,
//             variant,
//             items,
//             totalPrice
//         }, { new: true });

//         return res.status(200).json({ status: 200, success: true, message: "Order Update SuccessFully...", data: updateOrderId });

//     } catch (error) {
//         console.log(error)
//         return res.status(500).json({ status: 500, success: false, message: error.message })
//     }
// }

// exports.deleteOrderById = async (req, res) => {
//     try {
//         let id = req.params.id

//         let deleteOrderId = await order.findById(id)

//         if (!deleteOrderId) {
//             return res.status(404).json({ status: 404, success: false, message: "Order Not Found" })
//         }

//         await order.findByIdAndDelete(id)

//         return res.status(200).json({ status: 200, success: true, message: "Order Delete SuccessFully...." })

//     } catch (error) {
//         console.log(error)
//         return res.status(500).json({ status: 500, success: false, message: error.message })
//     }
// }