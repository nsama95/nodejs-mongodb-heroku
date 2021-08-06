// config.js
const dotenv = require('dotenv').config();

module.exports = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    MONGO_URL: process.env.MONGO_URL || 'mongodb+srv://nany:sama@cluster0.ucpho.mongodb.net/myFirstDatabase?retryWrites=true&w=majority',
    MONGO_DB_NAME: process.env.MONGO_DB_NAME || 'test'
}