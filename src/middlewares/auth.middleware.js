import User from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import ApiError from "../utils/apiError.js";


 const verifyJwt = asyncHandler(async (req, res, next) => {
    try {
        const accessToken = req.cookies?.accessToken || req.headers("Authorization")?.replace("Bearer ", "");
    
        if (!accessToken) {
            return res.status(401).json(new ApiError(401, "Unauthorized"));
        }
    
        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    
        const user = await User.findById(decoded?._id).select("-password -refreshToken");
    
        if (!user) {
            return res.status(401).json(new ApiError(401, "Unauthorized"));
        }
    
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json(new ApiError(401, "Invalid access token"));
    }
});

export default verifyJwt;
