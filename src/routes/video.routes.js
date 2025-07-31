import { Router } from "express";
import { createVideo, getUserVideos, searchVideos, updateVideo, deleteVideo, togglePublishStatus } from "../controllers/video.controller.js";
import verifyJwt from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.middleware.js";

const router = Router();
router.use(verifyJwt);

// Publish Video Router (Secured)
router.route("/publish").post(upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
]), createVideo);

// Search Videos Router (Secured)
router.route("/").get(searchVideos);

router.route("/:userId").get(getUserVideos);

// Update & Delete Video Router (Secured)
router.route("/:id").patch(updateVideo).delete(deleteVideo);

// Toggle Publish Status Router (Secured)
router.route("/:id/publish").patch(togglePublishStatus);

export default router;
