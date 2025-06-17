import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/apiError.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import User from "../models/user.model.js";

const registerUser = asyncHandler(async (req, res) => {
    const { userName, fullName, email, password } = req.body;

    if ([userName, fullName, email, password].some(field => field?.trim() === "")) {
        const errors = [];
        if (!userName?.trim()) {
            errors.push({
                field: "userName",
                message: "User name is required",
            });
        }
        if (!fullName?.trim()) {
            errors.push({
                field: "fullName",
                message: "Full name is required",
            });
        }
        if (!email?.trim()) {
            errors.push({
                field: "email",
                message: "Email is required",
            });
        }
        if (!password?.trim()) {
            errors.push({
                field: "password",
                message: "Password is required",
            });
        }
        return res.status(400).json(new ApiError(400, "All fields are required", errors));
    }

    const existingUser = await User.findOne({ $or: [{ email }, { userName }] })
    if(existingUser){
        return res.status(409).json(new ApiError(409, "User already exists"));
    }

    let profileImageLocalPath;
    if(req.files && Array.isArray(req.files.profilePicture) && req.files.profilePicture.length > 0){
        profileImageLocalPath = req.files.profilePicture[0].path;
    }

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverPicture) && req.files.coverPicture.length > 0){
        coverImageLocalPath = req.files.coverPicture[0].path;
    }

    if(!profileImageLocalPath){
        return res.status(400).json(new ApiError(400, "Profile picture is required"));
    }

    const profilePicture = await uploadOnCloudinary(profileImageLocalPath);
    if(!profilePicture){
        return res.status(500).json(new ApiError(500, "Failed to upload profile picture"));
    }

    let coverPicture;
    if(coverImageLocalPath){
        coverPicture = await uploadOnCloudinary(coverImageLocalPath);
        if(!coverPicture){
            return res.status(500).json(new ApiError(500, "Failed to upload cover picture"));
        }
    }

    const user = await User.create({
        userName: userName.toLowerCase(),
        fullName: fullName,
        email: email.toLowerCase(),
        password: password,
        profilePicture: profilePicture.url,
        coverPicture: coverPicture?.url || "",
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if(!createdUser){
        return res.status(500).json(new ApiError(500, "Failed to create user"));
    }

    return res.status(201).json(new ApiResponse(200, createdUser, "User registered successfully"));
});

export { registerUser };
