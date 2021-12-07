require('dotenv').config()

export const config = {
  env : process.env.ENV || "dev",
  port : process.env.port || 4000,
  httpsCertPath : process.env.httpsCertPath,
  httpsKeyPath : process.env.httpsKeyPath,
  log: {
    level: process.env.LOGLEVEL,
    format: process.env.LOGFORMAT
  },
  passSignPwd: process.env.PASS_SIGN_PWD
}