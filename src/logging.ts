const winston = require('winston')
const expressWinston = require('express-winston')
import { config } from './config'

const formats = {
    "color" : winston.format.combine(
        winston.format(info => ({ ...info, level: info.level.toUpperCase() }))(),
        winston.format.colorize(),
        winston.format.errors({ stack: true }),
        winston.format.prettyPrint(),
        winston.format.simple(),
        winston.format.splat(),
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.printf(
          ({ timestamp, level, message }) => `${timestamp} ${level.padStart(15)}: ${message}`
        ),
    ),
    "raw" : winston.format.combine(
        winston.format(info => ({ ...info, level: info.level.toUpperCase() }))(),
        winston.format.errors({ stack: true }),
        winston.format.prettyPrint(),
        winston.format.simple(),
        winston.format.splat(),
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.printf(
          ({ timestamp, level, message }) => `${timestamp} ${level.padStart(5)}: ${message}`
        )
    ),
    "json" : winston.format.combine(
        winston.format(info => ({ ...info, level: info.level.toUpperCase() }))(),
        winston.format.errors({ stack: true }),
        winston.format.prettyPrint(),
        winston.format.simple(),
        winston.format.splat(),
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.json()
    )
}

export const log = winston.createLogger({
    level: config.log.level,
    transports: [
        new winston.transports.Console()
    ],
    format: formats[config.log.format]
})

export const requestLogger = expressWinston.logger({
    transports: [
        new winston.transports.Console()
    ],
    meta: true,
    format: log.format
})

