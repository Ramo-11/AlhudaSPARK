const { createLogger, transports, format } = require("winston")

const customFormat = format.combine(
    format.timestamp({format: "YYYY-MM-DD HH:mm:ss"}),
    format.printf((info) => {
    return `${info.timestamp} = [${info.level.toUpperCase().padEnd(6)}] - ${info.message}`
}))

const generalLogger = createLogger({
    format: customFormat,
    transports: [
        new transports.File({filename: "./logs/general.log", level: "silly"})
    ]
})

module.exports = { generalLogger }