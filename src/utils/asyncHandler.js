const asyncHandler = (requestHandler) => {
    return async (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next))
            .catch((error) => next(error));
    }
}

// const asyncHandler = async (requestHandler) => {
//     return async (req, res, next) => {
//         try {
//            await requestHandler(req, res, next);
//         } catch (error) {
//             res.status(error.statusCode || 500).json({
//                 success: false,
//                 message: error.message || "Something went wrong",
//             });
//         }
//     }
// }

export default asyncHandler;
