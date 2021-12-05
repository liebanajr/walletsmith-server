require('dotenv').config()

export const config = {
  env : process.env.ENV || "dev",
  port : process.env.port,
  httpsCertPath : process.env.httpsCertPath,
  httpsKeyPath : process.env.httpsKeyPath,
  log: {
    level: process.env.LOGLEVEL,
    format: process.env.LOGFORMAT
  },
  passesFolder: process.env.passesFolder || "/tmp"
}