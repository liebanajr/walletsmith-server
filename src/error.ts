import { log } from "./logging";

export const handleError = (err, req, res, next) => {
  let { code, message, stack } = err;
  code = code || 500
  message = message || "Generic error"
  stack = stack || ""
  log.error(message + "\n" + stack)
  res.status(code).json({
    status: "error",
    code,
    message
  });
};

export class ErrorHandler extends Error {
  private code;
  constructor(code: number, message: string) {
    super();
    this.code = code;
    this.message = message;
  }
}