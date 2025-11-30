# Airtable Form Builder | MERN + OAuth + Conditional Logic

This project lets you create dynamic forms with conditional fields  
and saves responses to both **MongoDB + Airtable**, including webhook sync.

---

## Features

| Feature | Status |
|---|---|
| Form Builder UI | ✔ |
| Conditional Logic (student → college, professional → company) | ✔ |
| Save responses to MongoDB | ✔ |
| Sync responses to Airtable | ✔ |
| Webhook → Airtable → Mongo sync | ✔ |
| OAuth Login (Client ID + Secret) | ✔ |
| Response listing page | ✔ |

---

## Tech Stack

- React (simple UI, no UI framework)
- Node + Express
- MongoDB + Mongoose
- Airtable OAuth + REST API

---

## Run Locally

```bash
cd server
npm install
cp sample.env.example .env       # then fill values
node src/index.js
