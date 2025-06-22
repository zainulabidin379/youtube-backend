import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/apiError.js";
import { uploadOnCloudinary, deleteCloudinaryFile } from "../utils/cloudinary.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { cookieOptions } from "../constants.js";
import mongoose from "mongoose";

// Generate Access and Refresh Tokens
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new Error("Something went wrong while generating tokens",);
    }
}

// Register User
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
    if (existingUser) {
        return res.status(409).json(new ApiError(409, "User already exists"));
    }

    let profileImageLocalPath;
    if (req.files && Array.isArray(req.files.profilePicture) && req.files.profilePicture.length > 0) {
        profileImageLocalPath = req.files.profilePicture[0].path;
    }

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverPicture) && req.files.coverPicture.length > 0) {
        coverImageLocalPath = req.files.coverPicture[0].path;
    }

    if (!profileImageLocalPath) {
        return res.status(400).json(new ApiError(400, "Profile picture is required"));
    }

    const profilePicture = await uploadOnCloudinary(profileImageLocalPath);
    if (!profilePicture) {
        return res.status(500).json(new ApiError(500, "Failed to upload profile picture"));
    }

    let coverPicture;
    if (coverImageLocalPath) {
        coverPicture = await uploadOnCloudinary(coverImageLocalPath);
        if (!coverPicture) {
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

    if (!createdUser) {
        return res.status(500).json(new ApiError(500, "Failed to create user"));
    }

    return res.status(201).json(new ApiResponse(200, createdUser, "User registered successfully"));
});

// Login User
const loginUser = asyncHandler(async (req, res) => {
    const { userName, email, password } = req.body;

    if (!(userName || email)) {
        return res.status(400).json(new ApiError(400, "User name or email is required"));
    }

    if (!password) {
        return res.status(400).json(new ApiError(400, "Password is required"));
    }

    const user = await User.findOne({ $or: [{ userName }, { email }] });
    if (!user) {
        return res.status(404).json(new ApiError(404, "User not found"));
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        return res.status(401).json(new ApiError(401, "Invalid credentials"));
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    return res.status(200).cookie("accessToken", accessToken, cookieOptions).cookie("refreshToken", refreshToken, cookieOptions).json(new ApiResponse(200, {
        user: loggedInUser,
        accessToken,
        refreshToken
    }, "User logged in successfully"));
});

// Logout User
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { $set: { refreshToken: "" } }, { new: true });

    return res.status(200).clearCookie("accessToken", cookieOptions).clearCookie("refreshToken", cookieOptions).json(new ApiResponse(200, {}, "User logged out successfully"));
});

// Refresh Access Token
const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

        console.log("Incoming Refresh Token: ", incomingRefreshToken);

        if (!incomingRefreshToken) {
            return res.status(401).json(new ApiError(401, "Invalid refresh token"));
        }


        const decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decoded?._id);

        console.log("User: ", user);

        if (!user) {
            return res.status(401).json(new ApiError(401, "Invalid refresh token"));
        }

        if (incomingRefreshToken !== user.refreshToken) {
            return res.status(401).json(new ApiError(401, "Refresh token is expired or invalid"));
        }

        const { newAccessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

        return res.status(200).cookie("accessToken", newAccessToken, cookieOptions).cookie("refreshToken", newRefreshToken, cookieOptions).json(new ApiResponse(200, {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        }, "Access Token Refreshed successfully"));
    } catch (error) {
        return res.status(500).json(new ApiError(500, error?.message || "Something went wrong while refreshing access token"));
    }
});

// Change Password
const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return res.status(400).json(new ApiError(400, "Old password and new password are required"));
    }

    const user = await User.findById(req.user?._id);
    if (!user) {
        return res.status(404).json(new ApiError(404, "User not found"));
    }

    const isPasswordValid = await user.comparePassword(oldPassword);
    if (!isPasswordValid) {
        return res.status(401).json(new ApiError(401, "Invalid credentials"));
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
});

// Get Current User
const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(200, req.user, "User fetched successfully"));
});

// Get user by id
const getUserById = asyncHandler(async (req, res) => {
    console.log("User ID: ", req.params.id);
    const user = await User.findById(req.params.id).select("-password -refreshToken");
    console.log("User: ", user);
    if (!user) {
        return res.status(404).json(new ApiError(404, "User not found"));
    }
    return res.status(200).json(new ApiResponse(200, user, "User fetched successfully"));
});

// Update User Details
const updateUserDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!(fullName || email)) {
        return res.status(400).json(new ApiError(400, "Full name and email are required"));
    }

    const user = await User.findByIdAndUpdate(req.user?._id, { $set: { fullName, email } }, { new: true }).select("-password -refreshToken");

    return res.status(200).json(new ApiResponse(200, user, "User updated successfully"));
});

// Update Profile Picture
const updateProfilePicture = asyncHandler(async (req, res) => {
    const profileImageLocalPath = req.file?.path;

    if (!profileImageLocalPath) {
        return res.status(400).json(new ApiError(400, "Profile picture is required"));
    }

    // Get user with old profile picture URL
    const oldUser = await User.findById(req.user?._id);
    if (!oldUser) {
        return res.status(404).json(new ApiError(404, "User not found"));
    }

    // Upload new profile picture
    const profilePicture = await uploadOnCloudinary(profileImageLocalPath);
    if (!profilePicture?.url) {
        return res.status(500).json(new ApiError(500, "Failed to upload profile picture"));
    }

    // Delete old profile picture from Cloudinary if it exists
    if (oldUser.profilePicture) {
        await deleteCloudinaryFile(oldUser.profilePicture);
    }

    // Update user with new profile picture
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { profilePicture: profilePicture.url } },
        { new: true }
    ).select("-password -refreshToken");

    return res.status(200).json(new ApiResponse(200, user, "Profile picture updated successfully"));
});

// Update Cover Picture
const updateCoverPicture = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        return res.status(400).json(new ApiError(400, "Cover picture is required"));
    }

    // Get user with old cover picture URL
    const oldUser = await User.findById(req.user?._id);
    if (!oldUser) {
        return res.status(404).json(new ApiError(404, "User not found"));
    }

    // Upload new cover picture
    const coverPicture = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverPicture?.url) {
        return res.status(500).json(new ApiError(500, "Failed to upload cover picture"));
    }

    // Delete old cover picture from Cloudinary if it exists
    if (oldUser.coverPicture) {
        await deleteCloudinaryFile(oldUser.coverPicture);
    }

    // Update user with new cover picture
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { coverPicture: coverPicture.url } },
        { new: true }
    ).select("-password -refreshToken");

    return res.status(200).json(new ApiResponse(200, user, "Cover picture updated successfully"));
});

// Get user channel profile
const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { userName } = req.params;
    if (!userName) {
        return res.status(400).json(new ApiError(400, "User name is missing"));
    }

    const channel = await User.aggregate([
        {
            $match: { userName: userName?.toLowerCase() }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedChannels"
            }
        },
        {
            $addFields: {
                subscribersCount: { $size: "$subscribers" },
                subscribedChannelsCount: { $size: "$subscribedChannels" },
                isSubscribed: { $cond: { if: { $in: [req.user?._id, "$subscribers.subscriber"] }, then: true, else: false } }
            }
        },
        {
            $project: {
                userName: 1,
                fullName: 1,
                email: 1,
                profilePicture: 1,
                coverPicture: 1,
                subscribersCount: 1,
                subscribedChannelsCount: 1,
                isSubscribed: 1,
                createdAt: 1
            }
        }
    ]);
    if (!channel?.length) {
        return res.status(404).json(new ApiError(404, "Channel does not exist"));
    }
    return res.status(200).json(new ApiResponse(200, channel[0], "User channel profile fetched successfully"));
});

// Get user watch history
const getUserWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        userName: 1,
                                        fullName: 1,
                                        profilePicture: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: { $first: "$owner" }
                        }
                    }
                    
                ]
            }
        }
    ]);

    return res.status(200).json(new ApiResponse(200, user[0].watchHistory, "User watch history fetched successfully"));
});

// Add Video To Watch History
const addVideoToWatchHistory = asyncHandler(async (req, res) => {
    const { videoId } = req.body;
    if (!videoId) {
        return res.status(400).json(new ApiError(400, "Video ID is required"));
    }
    const user = await User.findById(req.user?._id);
    if (!user) {
        return res.status(404).json(new ApiError(404, "User not found"));
    }
    user.watchHistory.push(videoId);
    await user.save({ validateBeforeSave: false });
    return res.status(200).json(new ApiResponse(200, user.watchHistory, "Video added to watch history successfully"));
});

export { registerUser, loginUser, logoutUser, refreshAccessToken, changePassword, getCurrentUser, updateUserDetails, getUserById, updateProfilePicture, updateCoverPicture, getUserChannelProfile, getUserWatchHistory, addVideoToWatchHistory };
