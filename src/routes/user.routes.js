import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken, changePassword, getCurrentUser, updateUserDetails, getUserById, updateProfilePicture, updateCoverPicture, getUserWatchHistory, getUserChannelProfile, addVideoToWatchHistory } from "../controllers/user.controller.js";
import upload from "../middlewares/multer.middleware.js";
import verifyJwt from "../middlewares/auth.middleware.js";

const router = Router();

// Register Router
router.route("/register").post(upload.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "coverPicture", maxCount: 1 },
]), registerUser);

// Login Router
router.route("/login").post(loginUser);

// Logout Router (Secured)
router.route("/logout").post(verifyJwt, logoutUser);

// Refresh Access Token Router (Secured)
router.route("/refresh-token").post(refreshAccessToken);

// Change Password Router (Secured)
router.route("/change-password").patch(verifyJwt, changePassword);

// Get Current User Router (Secured)
router.route("/current-user").get(verifyJwt, getCurrentUser);

// Update User Details Router (Secured)
router.route("/update-user-details").patch(verifyJwt, updateUserDetails);

// Get User By Id Router (Secured)
router.route("/user/:id").get(verifyJwt, getUserById);

// Update Profile Picture Router (Secured)
router.route("/update-profile-picture").patch(verifyJwt, upload.single("profilePicture"), updateProfilePicture);

// Update Cover Picture Router (Secured)
router.route("/update-cover-picture").patch(verifyJwt, upload.single("coverPicture"), updateCoverPicture);

// Get User Watch History Router (Secured)
router.route("/watch-history").get(verifyJwt, getUserWatchHistory);

// Get User Channel Profile Router (Secured)
router.route("/channel/:userName").get(verifyJwt, getUserChannelProfile);

// Add Video To Watch History Router (Secured)
router.route("/watch-history").patch(verifyJwt, addVideoToWatchHistory);
export default router;