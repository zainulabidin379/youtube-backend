import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema({
    userName: {
        type: String,
        required: [true, "UserName is required"],
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    fullName: {
        type: String,
        required: [true, "Full name is required"],
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true, "Password is required"],
    },
    profilePicture: {
        type: String,
    },
    coverPicture: {
        type: String,
    },
    watchHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video",
        }
    ],
    followers: {
        type: Array,
        default: [],
    },
    following: {
        type: Array,
        default: [],
    },
    refreshToken: {
        type: String,
    },
}, {
    timestamps: true,
});

userSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
    return jwt.sign({ id: this._id, userName: this.userName, fullName: this.fullName, email: this.email }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    });
};

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign({ id: this._id }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    });
};

const User = mongoose.model("User", userSchema);

export default User;
