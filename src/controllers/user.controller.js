import asyncHandler from "../utils/asyncHandler.js";
import APIResponse from "../utils/apiResponse.js";
import APIError from "../utils/apiError.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import User from "../models/user.model.js";

const registerUser = asyncHandler(async (req, res) => {
    const { userName, fullName, email, password } = req.body;

    if ([userName, fullName, email, password].some(field => field?.trim() === "")) {
        throw new APIError(400, "All fields are required");
    }

    const existingUser = await User.findOne({ $or: [{ email }, { userName }] })
    if(existingUser){
        throw new APIError(409, "User already exists");
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
        throw new APIError(400, "Profile picture is required");
    }

    const profilePicture = await uploadOnCloudinary(profileImageLocalPath);
    if(!profilePicture){
        throw new APIError(500, "Failed to upload profile picture");
    }

    let coverPicture;
    if(coverImageLocalPath){
        coverPicture = await uploadOnCloudinary(coverImageLocalPath);
        if(!coverPicture){
            throw new APIError(500, "Failed to upload cover picture");
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
        throw new APIError(500, "Failed to create user");
    }

    return res.status(201).json(new APIResponse(200, createdUser, "User registered successfully"));
});

export { registerUser };
