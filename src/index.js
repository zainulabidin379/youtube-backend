
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import mongoose from "mongoose";
import connectToDB from "./db/db.js";

connectToDB();