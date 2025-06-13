import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema({
    title: {
        type: String,
        required: [true, "Title is required"],
    },
    description: {
        type: String,
        required: [true, "Description is required"],
    },
    thumbnail: {
        type: String,
        required: [true, "Thumbnail is required"],
    },
    video: {
        type: String,
        required: [true, "Video is required"],
    },
    views: {
        type: Number,
        default: 0,
    },
    duration: {
        type: Number,
        required: [true, "Duration is required"],
    },
    isPublished: {
        type: Boolean,
        default: true,
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    

    
}, {
    timestamps: true,
});

videoSchema.plugin(mongooseAggregatePaginate);

const Video = mongoose.model("Video", videoSchema);

export default Video;
