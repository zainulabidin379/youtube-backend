import mongoose from "mongoose";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/apiError.js";
import Video from "../models/video.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const searchVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", } = req.query

    if (sortType !== "asc" && sortType !== "desc") {
        throw new ApiError(400, "Sort type must be 'asc' or 'desc'");
    }
    if (page < 1 || limit < 1) {
        throw new ApiError(400, "Page and limit must be greater than 0");
    }

    const videos = await Video.find({
        ...(query && { title: { $regex: query, $options: "i" } }),
    })
    .sort({ [sortBy]: sortType })
    .skip((page - 1) * limit)
    .limit(limit);
    res.status(200).json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

const getUserVideos = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 10, sortBy = "createdAt", sortType = "desc", } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    if (sortType !== "asc" && sortType !== "desc") {
        throw new ApiError(400, "Sort type must be 'asc' or 'desc'");
    }
    if (page < 1 || limit < 1) {
        throw new ApiError(400, "Page and limit must be greater than 0");
    }

    const videos = await Video.find({
        owner: userId,
    })
    .sort({ [sortBy]: sortType })
    .skip((page - 1) * limit)
    .limit(limit);
    res.status(200).json(new ApiResponse(200, videos, "User videos fetched successfully"));
});

const createVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    if (!title || !description) {
        throw new ApiError(400, "All fields are required");
    }
    let videoLocalPath;
    if (req.files && Array.isArray(req.files.video) && req.files.video.length > 0) {
        videoLocalPath = req.files.video[0].path;
    }

    let thumbnailLocalPath;
    if (req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0) {
        thumbnailLocalPath = req.files.thumbnail[0].path;
    }

    if (!videoLocalPath) {
        throw new ApiError(400, "Video is required");
    }
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required");
    }
    
    const cloudinaryVideo = await uploadOnCloudinary(videoLocalPath);
    if (!cloudinaryVideo) {
        throw new ApiError(500, "Failed to upload video");
    }

    const cloudinaryThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!cloudinaryThumbnail) {
        throw new ApiError(500, "Failed to upload thumbnail");
    }
    const uploadedVideo = await Video.create({
        title,
        description,
        thumbnail: cloudinaryThumbnail.url,
        video: cloudinaryVideo.url,
        owner: req.user._id,
        duration: cloudinaryVideo.duration,
    });
    res.status(201).json(new ApiResponse(201, uploadedVideo, "Video published successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description } = req.body;
    if (!title || !description) {
        throw new ApiError(400, "All fields are required");
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid video ID");
    }
    const video = await Video.findById(id);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this video");
    }
    const updatedVideo = await Video.findByIdAndUpdate(id, { title, description }, { new: true });
    res.status(200).json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const updateVideoThumbnail = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const thumbnailLocalPath = req.files?.path;
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required");
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid video ID");
    }
    const video = await Video.findById(id);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this video");
    }
    const cloudinaryThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!cloudinaryThumbnail) {
        throw new ApiError(500, "Failed to upload thumbnail");
    }
    await deleteCloudinaryFile(video.thumbnail);
    const updatedVideo = await Video.findByIdAndUpdate(id, { thumbnail: cloudinaryThumbnail.url }, { new: true });
    res.status(200).json(new ApiResponse(200, updatedVideo, "Video thumbnail updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid video ID");
    }
    const video = await Video.findById(id);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this video");
    }
    await deleteCloudinaryFile(video.video);
    await deleteCloudinaryFile(video.thumbnail);
    await video.remove();
    res.status(200).json(new ApiResponse(200, null, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid video ID");
    }
    const video = await Video.findById(id);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this video");
    }
    video.isPublished = !video.isPublished;
    await video.save({ validateBeforeSave: false });
    res.status(200).json(new ApiResponse(200, video, "Video publish status toggled successfully"));
})


export { searchVideos, getUserVideos, createVideo, updateVideo, deleteVideo, togglePublishStatus };
