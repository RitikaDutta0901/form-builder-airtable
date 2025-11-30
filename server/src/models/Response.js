import mongoose from "mongoose";

const responseSchema = new mongoose.Schema(
  {
    // we just store the form id as a string ("demo-form-1")
    formId: {
      type: String,
      required: true,
    },

    // later, when you sync to Airtable, you can store the record id here
    airtableRecordId: {
      type: String,
      default: null,
    },

    // raw answers as JSON { name: "Ritika", role: "student", ... }
    answers: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

const Response = mongoose.model("Response", responseSchema);

export default Response;
