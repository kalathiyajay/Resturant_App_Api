require('dotenv').config();
const express = require('express')
const server = express();
const port = process.env.PORT || 5000
const path = require('path');
const connectDB = require('./db/db');
const indexRoutes = require('./routes/index.routes');




server.use(express.json());
server.use('/public', express.static(path.join(__dirname, 'public')))
server.use('/api', indexRoutes);


server.listen(port, () => {
    connectDB();
    console.log(`Server Is Connected At ${port}`);
})   