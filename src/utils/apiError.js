class ApiError extends Error {
    constructor(statusCode, message = "Something went wrong", errors = [], stack = "", cause = undefined) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.message = message;
        this.cause = cause;
        this.success = false;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export default ApiError;
