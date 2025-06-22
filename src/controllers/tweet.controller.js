import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/apiError.js";
import Tweet from "../models/tweet.model.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// Create Tweet
const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;

    if (!content?.trim()) {
        throw new ApiError(400, "Tweet content is required");
    }

    const user = await User.findById(req.user?._id);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const tweet = await Tweet.create({
        content,
        owner: user._id,
    });

    res.status(201).json(new ApiResponse(201, tweet, "Tweet created successfully"));
});

// Get User Tweets
const getUserTweets = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user?._id);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const tweets = await Tweet.aggregate([
        {
            $match: { owner: user._id }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $addFields: {
                owner: { $first: "$owner" }
            }
        }
    ]);

    res.status(200).json(new ApiResponse(200, tweets, "User tweets fetched successfully"));
});

// Update Tweet
const updateTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params?.id) || !content?.trim()) {
        throw new ApiError(400, "Invalid tweet ID or content");
    }

    const tweet = await Tweet.findByIdAndUpdate(req.params?.id, { content }, { new: true });
    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    res.status(200).json(new ApiResponse(200, tweet, "Tweet updated successfully"));
});

// Delete Tweet
const deleteTweet = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    const tweet = await Tweet.findByIdAndDelete(id);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    res.status(200).json(new ApiResponse(200, tweet, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };


