import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = "mongodb://localhost:27017/crm";

try {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  
  const password = "Test@123";
  const salt = await bcrypt.genSalt(12);
  const hashed = await bcrypt.hash(password, salt);
  
  const result = await db.collection("users").updateOne(
    { email: "fizzzydev@gmail.com" },
    { $set: { password: hashed, isEmailVerified: true } }
  );
  
  console.log("Updated:", result.modifiedCount, "documents");
  console.log("New password:", password);
  
  await mongoose.disconnect();
} catch(e) {
  console.error("Error:", e.message);
}
