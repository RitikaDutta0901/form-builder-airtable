// server/src/models/User.js

import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // for this assignment we just use one demo user
    userId: { type: String, default: "demo-user-1" },

    // Airtable profile info (optional)
    airtableUserId: String,
    email: String,
    name: String,

    // tokens we get from Airtable OAuth
    accessToken: String,
    refreshToken: String,

    // when login happened
    loginAt: Date,
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

// IMPORTANT: default export
export default User;
