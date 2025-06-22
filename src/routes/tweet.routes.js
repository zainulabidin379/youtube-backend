import { Router } from "express";
import { createTweet, getUserTweets, updateTweet, deleteTweet } from "../controllers/tweet.controller.js";
import verifyJwt from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJwt);

// Create Tweet Router (Secured)
router.route("/create-tweet").post(createTweet);

// Get User Tweets Router (Secured)
router.route("/user-tweets/:userId").get(getUserTweets);

// Update & Delete Tweet Router (Secured)
router.route("/tweet/:id").patch(updateTweet).delete(deleteTweet);

export default router;
