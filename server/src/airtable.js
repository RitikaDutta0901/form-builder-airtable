import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

export async function sendToAirtable(formId, answers) {
  try {
    const record = await base(process.env.AIRTABLE_TABLE_NAME).create({
      FormID: formId,
      Responses: JSON.stringify(answers),   
    });

    console.log("🟢 Airtable record created:", record.id);
    return record.id;
  } catch (err) {
    console.log("❌ Airtable error:", err.message);
    return null; 
  }
}
