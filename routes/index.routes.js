const express = require('express');
const { createSuperAdmin, createNewChef, createNewWaiter, createNewAccountant, getAllUsers, getUserById, updateUserById, deleteUserById, dashBoard } = require('../controller/user.controller');
const upload = require('../helper/imageUplode');
const { loginContact, verifyOtp, resendOtp } = require('../auth/login');
const { createCategory, getAllCategory, getCategoryById, updateCategory, deleteCategory } = require('../controller/category.controller');
const { createDish, getAllDish, getDishById, updateDishById, deleteDishById } = require('../controller/dish.controller');
const { createVariant, getAllVariant, getVariantById, updateVariantById, deleteVariantById } = require('../controller/variant.controller');
const { createTable, getAllTables, getTableById, updateTableById, deleteTableById } = require('../controller/table.controller');
const { createOrder, getAllOrders, getOrderById, updateOrderStatusById, deleteOrderById, updateOrderById, deleteOrderItem, updateOrderItemQuantity } = require('../controller/order.controller');
const { generateBill, getAllGenerateBills, getGenerateBillsById, generateBillPayment } = require('../controller/billPayment.controller');
const { auth } = require('../helper/authToken');
const indexRoutes = express.Router();


// ------------------------ All Routes -----------------------------------

// Auth Routes 

indexRoutes.post('/login', loginContact);
indexRoutes.post('/verifyOtp', verifyOtp);
indexRoutes.post('/resendOtp', resendOtp);

// User Routes

indexRoutes.post('/createSuperAdmin', upload.single('image'), createSuperAdmin);
indexRoutes.post('/createChef', auth(['Super Admin']), upload.single('image'), createNewChef);
indexRoutes.post('/createWaiter', auth(['Super Admin']), upload.single('image'), createNewWaiter);
indexRoutes.post('/createAccountant', auth(['Super Admin']), upload.single('image'), createNewAccountant);
indexRoutes.get('/allUsers', auth(['Super Admin']), getAllUsers);
indexRoutes.get('/getUser/:id', auth(['Super Admin', 'Chef', 'Waiter', 'Accountant']), getUserById);
indexRoutes.put('/updateUser/:id', auth(['Super Admin', 'Chef', 'Waiter', 'Accountant']), upload.single('image'), updateUserById);
indexRoutes.delete('/deleteUser/:id', auth(['Super Admin']), deleteUserById);

// category Routes 

indexRoutes.post('/createCategory', auth(['Super Admin', 'Chef']), upload.single('categoryImage'), createCategory);
indexRoutes.get('/allCategory', auth(['Super Admin', 'Chef', 'Waiter']), getAllCategory);
indexRoutes.get('/getCategory/:id', auth(['Super Admin', 'Chef', 'Waiter']), getCategoryById);
indexRoutes.put('/updateCategory/:id', auth(['Super Admin', 'Chef']), upload.single('categoryImage'), updateCategory);
indexRoutes.delete('/deleteCategory/:id', auth(['Super Admin', 'Chef']), deleteCategory);

// Dish Routes

indexRoutes.post('/createDish', auth(['Super Admin', 'Chef']), upload.single('dishImage'), createDish)
indexRoutes.get('/allDish', auth(['Super Admin', 'Chef', 'Waiter', 'Accountant']), getAllDish);
indexRoutes.get('/getDish/:id', auth(['Super Admin', 'Chef', 'Waiter']), getDishById);
indexRoutes.put('/updateDish/:id', auth(['Super Admin', 'Chef']), upload.single('dishImage'), updateDishById);
indexRoutes.delete('/deleteDish/:id', auth(['Super Admin', 'Chef']), deleteDishById);

// variant Routes

indexRoutes.post('/createVariant', auth(['Super Admin', 'Chef']), upload.single('variantImage'), createVariant);
indexRoutes.get('/allVarians', auth(['Super Admin', 'Chef', 'Waiter']), getAllVariant);
indexRoutes.get('/getVariant/:id', auth(['Super Admin', 'Chef', 'Waiter']), getVariantById);
indexRoutes.put('/updateVariant/:id', auth(['Super Admin', 'Chef']), upload.single('variantImage'), updateVariantById);
indexRoutes.delete('/deleteVariant/:id', auth(['Super Admin', 'Chef']), deleteVariantById);

// table Routes

indexRoutes.post('/createTable', auth(['Super Admin', 'Waiter']), createTable);
indexRoutes.get('/allTables', auth(['Super Admin', 'Waiter']), getAllTables);
indexRoutes.get('/getTable/:id', auth(['Super Admin', 'Waiter', 'Accountant']), getTableById);
indexRoutes.put('/updateTable/:id', auth(['Super Admin']), updateTableById);
indexRoutes.delete('/deleteTable/:id', auth(['Super Admin']), deleteTableById);

// order Routes 

indexRoutes.post('/createOrder', auth(['Super Admin', 'Waiter']), createOrder)
indexRoutes.get('/allOrders', auth(['Super Admin', 'Chef', 'Waiter', 'Accountant']), getAllOrders)
indexRoutes.get('/getOrder/:id', auth(['Super Admin', 'Chef', 'Waiter', 'Accountant']), getOrderById)
indexRoutes.put('/updateOrderStatus/:id', auth(['Super Admin', 'Chef', 'Waiter']), updateOrderStatusById);
indexRoutes.put('/updateOrder/:id', auth(['Super Admin', 'Waiter']), updateOrderById);
indexRoutes.delete('/deleteOrder/:id', auth(['Super Admin', 'Waiter']), deleteOrderById);
indexRoutes.delete('/deleteOrderItem/:id', auth(['Super Admin', 'Waiter']), deleteOrderItem)
indexRoutes.put('/updateOrderItemQty/:id', auth(['Super Admin', 'Waiter']), updateOrderItemQuantity);

// BillPayment Routes

indexRoutes.post('/generateBill', auth(['Super Admin', 'Accountant', 'Waiter']), generateBill);
indexRoutes.get('/allGenerateBill', auth(['Super Admin', 'Accountant', 'Waiter']), getAllGenerateBills);
indexRoutes.get('/getGenerateBill/:id', auth(['Super Admin', 'Accountant', 'Waiter']), getGenerateBillsById)
indexRoutes.get('/billPayment/:id', auth(['Super Admin', 'Accountant']), generateBillPayment)

//dashBoard

indexRoutes.get('/dashBoard', auth(['Super Admin']), dashBoard);

module.exports = indexRoutes