const mongoose = require("mongoose")
const { generalLogger } = require("../generalLogger")

const connectDB = async() => {
    if (process.env.NODE_ENV !== "production") {
        process.env.MONGODB_URI = process.env.MONGODB_URI_DEV
    } else {
        process.env.MONGODB_URI = process.env.MONGODB_URI_PROD
    }
    
    try {
        generalLogger.debug(`Attempting to connect to database with url: ${process.env.MONGODB_URI}`)
        const con = await mongoose.connect(process.env.MONGODB_URI)
        generalLogger.info(`MongoDB connected successfully: ${con.connection.host}`)
    } catch(error) {
        generalLogger.error("unable to connect to database: are you sure the IP address is whitelisted in the database?\n")
        generalLogger.debug(error)
    }
}

module.exports = connectDB