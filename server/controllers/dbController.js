const mongoose = require("mongoose")
const { logger } = require("../logger")

const connectDB = async () => {
    const isProd = process.env.NODE_ENV === "production"
    const baseUri = isProd ? process.env.MONGODB_URI_PROD : process.env.MONGODB_URI_DEV
    const dbName = isProd ? process.env.DB_NAME_PROD : process.env.DB_NAME_DEV

    process.env.MONGODB_URI = `${baseUri}${baseUri.includes("?") ? "&" : "?"}dbName=${dbName}`

    try {
        logger.debug(`Attempting to connect to database '${dbName}' with url: ${process.env.MONGODB_URI}`)
        const con = await mongoose.connect(process.env.MONGODB_URI)
        logger.info(`MongoDB connected successfully: ${con.connection.host}`)
    } catch (error) {
        logger.error("unable to connect to database: are you sure the IP address is whitelisted in the database?\n")
        logger.debug(error)
    }
}

module.exports = connectDB
