// server/src/index.js

import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import Airtable from "airtable";
import axios from "axios";

import User from "./models/User.js";
import { shouldShowQuestion } from "./utils/conditionalLogic.js";

const DEMO_USER_ID = "demo-user-1";

const app = express();
const PORT = process.env.PORT||5000 ;

app.use(
  cors({
    origin: "http://localhost:3000", // later add your deployed frontend origin here
    credentials: true,
  })
);
app.use(express.json());

// ---------------------------------------------------
// MongoDB setup
// ---------------------------------------------------

// Enforce MONGO_URL so we don't silently fall back to localhost
if (!process.env.MONGO_URL) {
  console.error("\n❌ MONGO_URL is NOT set in environment variables.\n");
  process.exit(1);
}

const MONGO_URL = process.env.MONGO_URL;

mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("MongoDB connected");
    ensureDefaultForm();
  })
  .catch((err) => {
    console.log("MongoDB connection error:", err.message);
  });

// ---------------------------------------------------
// Mongoose schemas
// ---------------------------------------------------

const formSchema = new mongoose.Schema({
  // internal form id (like "demo-form-1")
  id: String,

  // human title
  title: String,

  // simple "owner" string – for now we just use demo-user-1
  ownerId: { type: String, default: "demo-user-1" },

  // where this form is stored in Airtable (optional)
  airtableBaseId: { type: String, default: null },
  airtableTableName: { type: String, default: null },

  // list of questions – allow full objects (fix CastError)
  questions: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
});

const responseSchema = new mongoose.Schema(
  {
    formId: String,
    answers: Object,
    airtableRecordId: { type: String, default: null },
    deletedInAirtable: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Form = mongoose.model("Form", formSchema);
const Response = mongoose.model("Response", responseSchema);

// ---------------------------------------------------
// Airtable basic config (for saving responses)
// ---------------------------------------------------

let airtableBase = null;

if (
  process.env.AIRTABLE_API_KEY &&
  process.env.AIRTABLE_BASE_ID &&
  process.env.AIRTABLE_TABLE_NAME
) {
  Airtable.configure({ apiKey: process.env.AIRTABLE_API_KEY });
  airtableBase = Airtable.base(process.env.AIRTABLE_BASE_ID);
  console.log("Airtable configuration detected");
} else {
  console.log(
    "Airtable not fully configured (API key / base / table). Skipping Airtable sync."
  );
}

async function sendToAirtable(formId, answers) {
  if (!airtableBase) {
    return null;
  }

  try {
    const record = await airtableBase(
      process.env.AIRTABLE_TABLE_NAME
    ).create({
      FormID: String(formId), // text field in Airtable
      Responses: JSON.stringify(answers), // long text in Airtable
    });

    console.log("Airtable record created:", record.id);
    return record.id;
  } catch (err) {
    console.log("Airtable error:", err.message);
    return null;
  }
}

// ---------------------------------------------------
// Default questions and form reset
// ---------------------------------------------------

const baseQuestions = [
  {
    questionKey: "name",
    label: "Your name",
    type: "text",
    required: true,
    conditionalRules: null,
  },
  {
    questionKey: "role",
    label: "Are you a student or professional?",
    type: "text",
    required: true,
    conditionalRules: null,
  },
  {
    questionKey: "college",
    label: "College name",
    type: "text",
    required: false,
    conditionalRules: {
      logic: "AND",
      conditions: [
        {
          questionKey: "role",
          operator: "equals",
          value: "student",
        },
      ],
    },
  },
  {
    questionKey: "company",
    label: "Company name",
    type: "text",
    required: false,
    conditionalRules: {
      logic: "AND",
      conditions: [
        {
          questionKey: "role",
          operator: "equals",
          value: "professional",
        },
      ],
    },
  },
];

// on every server start, reset demo-form-1 back to baseQuestions
async function ensureDefaultForm() {
  try {
    await Form.findOneAndUpdate(
      { id: "demo-form-1" },
      {
        $set: {
          id: "demo-form-1",
          title: "Demo Form with Role",
          ownerId: DEMO_USER_ID,
          airtableBaseId: process.env.AIRTABLE_BASE_ID || null,
          airtableTableName: process.env.AIRTABLE_TABLE_NAME || null,
          questions: baseQuestions.map((q) => ({
            questionKey: q.questionKey,
            label: q.label,
            type: q.type,
            required: q.required,
            conditionalRules: q.conditionalRules || null,
            fieldId: null,
          })),
        },
      },
      { upsert: true, new: true }
    );

    console.log("Default form reset to base questions");
  } catch (err) {
    console.log("Error ensuring default form:", err.message);
  }
}

// ---------------------------------------------------
// Airtable OAuth (simple demo version)
// ---------------------------------------------------

// start OAuth flow
app.get("/auth/airtable/start", (req, res) => {
  const clientId = process.env.AIRTABLE_CLIENT_ID;
  const redirectUri = process.env.AIRTABLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res
      .status(500)
      .send("Airtable OAuth not configured in .env (client id / redirect).");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "data.records:read data.records:write schema.bases:read",
  });

  const url = `https://airtable.com/oauth2/v1/authorize?${params.toString()}`;
  res.redirect(url);
});

// callback from Airtable
app.get("/auth/airtable/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send("Missing ?code from Airtable");
  }

  try {
    const tokenRes = await axios.post(
      "https://airtable.com/oauth2/v1/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: process.env.AIRTABLE_CLIENT_ID,
        client_secret: process.env.AIRTABLE_CLIENT_SECRET,
        redirect_uri: process.env.AIRTABLE_REDIRECT_URI,
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const data = tokenRes.data;

    const userDoc = await User.findOneAndUpdate(
      { userId: DEMO_USER_ID },
      {
        userId: DEMO_USER_ID,
        airtableUserId: data?.user_id || null,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || null,
        loginAt: new Date(),
      },
      { upsert: true, new: true }
    );

    console.log("Airtable OAuth success for user:", userDoc.userId);

    res.send(
      "<h2>Airtable connected successfully.</h2><p>You can close this tab and go back to the app.</p>"
    );
  } catch (err) {
    console.log("Airtable token error:", err.response?.data || err.message);
    res.status(500).send("Failed to exchange code for token.");
  }
});

// simple status endpoint for frontend
app.get("/auth/me", async (req, res) => {
  try {
    const user = await User.findOne({ userId: DEMO_USER_ID }).lean();

    if (!user) {
      return res.json({ connected: false });
    }

    res.json({
      connected: !!user.accessToken,
      userId: user.userId,
      airtableUserId: user.airtableUserId || null,
      loginAt: user.loginAt || null,
    });
  } catch (err) {
    console.log("auth/me error:", err.message);
    res.status(500).json({ connected: false });
  }
});

// ---------------------------------------------------
// Main routes
// ---------------------------------------------------

app.get("/", (req, res) => {
  res.send("Form builder backend is running");
});

// get form by id
app.get("/forms/:id", async (req, res) => {
  try {
    const form = await Form.findOne({ id: req.params.id });

    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    res.json(form);
  } catch (err) {
    console.log("Error loading form:", err.message);
    res.status(500).json({ error: "Failed to load form" });
  }
});

// admin: save extra questions from builder
app.post("/admin/forms/:id", async (req, res) => {
  const extraQuestions = Array.isArray(req.body.questions)
    ? req.body.questions
    : [];

  const combinedQuestions = [...baseQuestions, ...extraQuestions];

  try {
    await Form.findOneAndUpdate(
      { id: req.params.id },
      {
        id: req.params.id,
        title: "Demo Form with Role",
        questions: combinedQuestions,
      },
      { upsert: true }
    );

    console.log(
      `Form ${req.params.id} updated. Extra fields: ${extraQuestions.length}`
    );
    res.json({ ok: true });
  } catch (err) {
    console.log("Error updating form:", err.message);
    res.status(500).json({ error: "Failed to update form" });
  }
});

// Airtable webhook endpoint (keeps Mongo in sync)
app.post("/webhooks/airtable", async (req, res) => {
  try {
    const body = req.body || {};
    const events = Array.isArray(body.events) ? body.events : [body];

    for (let i = 0; i < events.length; i++) {
      const evt = events[i];
      if (!evt || !evt.airtableRecordId) continue;

      if (evt.type === "record.deleted") {
        await Response.updateMany(
          { airtableRecordId: evt.airtableRecordId },
          { deletedInAirtable: true }
        );
        console.log(
          "Webhook: marked deleted for record",
          evt.airtableRecordId
        );
      }

      if (evt.type === "record.updated" && evt.answers) {
        await Response.updateMany(
          { airtableRecordId: evt.airtableRecordId },
          { answers: evt.answers }
        );
        console.log("Webhook: updated answers for", evt.airtableRecordId);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.log("Webhook error:", err.message);
    res.status(500).json({ error: "Webhook failed" });
  }
});

// submit form: validate required + save to Mongo and Airtable
app.post("/forms/:id/submit", async (req, res) => {
  const formId = req.params.id;
  const answers = req.body.answers || {};

  try {
    const form = await Form.findOne({ id: formId });
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    // very simple validation: check required + visible fields
    for (let i = 0; i < form.questions.length; i++) {
      const q = form.questions[i];

      const visible = shouldShowQuestion(q.conditionalRules, answers);
      if (!visible) {
        continue;
      }

      const value = answers[q.questionKey];

      if (q.required && (value === undefined || value === null || value === "")) {
        return res
          .status(400)
          .json({ error: `Missing value for required field: ${q.label}` });
      }
    }

    const airtableId = await sendToAirtable(formId, answers);

    const saved = await Response.create({
      formId,
      answers,
      airtableRecordId: airtableId,
    });

    console.log("Response saved with id:", saved._id.toString());
    res.json({ ok: true });
  } catch (err) {
    console.log("Error saving response:", err.message);
    res.status(500).json({ error: "Failed to save response" });
  }
});

// list responses for a form (DB only)
app.get("/forms/:id/responses", async (req, res) => {
  try {
    const docs = await Response.find({ formId: req.params.id })
      .sort({ createdAt: -1 })
      .lean();

    res.json(docs);
  } catch (err) {
    console.log("Error loading responses:", err.message);
    res.status(500).json({ error: "Failed to load responses" });
  }
});

// export responses as JSON file
app.get("/forms/:id/export/json", async (req, res) => {
  try {
    const docs = await Response.find({ formId: req.params.id })
      .sort({ createdAt: -1 })
      .lean();

    const filename = `responses-${req.params.id}.json`;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(JSON.stringify(docs, null, 2));
  } catch (err) {
    console.log("Error exporting JSON:", err.message);
    res.status(500).json({ error: "Failed to export JSON" });
  }
});

// export responses as CSV file
app.get("/forms/:id/export/csv", async (req, res) => {
  try {
    const docs = await Response.find({ formId: req.params.id })
      .sort({ createdAt: -1 })
      .lean();

    const filename = `responses-${req.params.id}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // simple CSV: id, createdAt, deletedInAirtable, answersJson
    const header = "id,createdAt,deletedInAirtable,answersJson\n";

    const lines = docs.map((r) => {
      const id = r._id?.toString().replace(/"/g, '""') || "";
      const created = r.createdAt ? new Date(r.createdAt).toISOString() : "";
      const deleted = r.deletedInAirtable ? "true" : "false";
      let answersJson = "";

      try {
        answersJson = JSON.stringify(r.answers || {});
      } catch (e) {
        answersJson = "{}";
      }

      const safeAnswers = answersJson.replace(/"/g, '""');

      return `"${id}","${created}","${deleted}","${safeAnswers}"`;
    });

    res.send(header + lines.join("\n"));
  } catch (err) {
    console.log("Error exporting CSV:", err.message);
    res.status(500).json({ error: "Failed to export CSV" });
  }
});

// ---------------------------------------------------
// Start server
// ---------------------------------------------------

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
