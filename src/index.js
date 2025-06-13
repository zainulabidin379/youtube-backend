
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import connectToDB from "./db/db.js";
import app from "./app.js";

connectToDB().then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server running on port ${process.env.PORT || 8000}`);
    });
}).catch((error) => {
    console.log("Error connecting to MongoDB: ", error);
    process.exit(1);
});