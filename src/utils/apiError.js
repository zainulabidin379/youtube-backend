class ApiError{
    constructor(statusCode, message = "Something went wrong", errors = []) {
        this.statusCode = statusCode;
        this.message = message;
        this.errors = errors;
        this.success = false;
    }
}

export default ApiError;
