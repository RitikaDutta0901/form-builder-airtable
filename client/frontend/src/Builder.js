import React, { useState } from "react";
import axios from "axios";


function Builder({ onBack }) {
  const [fields, setFields] = useState([]);

  function addField() {
    setFields((old) => [
      ...old,
      {
        key: "q" + (old.length + 1),
        label: "",
        required: false,
        type: "text", // default type
      },
    ]);
  }

  function changeLabel(index, newLabel) {
    const copy = [...fields];
    copy[index].label = newLabel;
    setFields(copy);
  }

  function toggleRequired(index) {
    const copy = [...fields];
    copy[index].required = !copy[index].required;
    setFields(copy);
  }

  function changeType(index, newType) {
    const copy = [...fields];
    copy[index].type = newType;
    setFields(copy);
  }

  function handleSave() {
    // convert builder fields to question objects understood by backend
    const extraQuestions = fields.map((f, i) => {
      const cleanLabel =
        f.label && f.label.trim() ? f.label.trim() : "Question " + (i + 1);
  
      return {
        questionKey: f.key,
        label: cleanLabel,
        type: f.type || "text",
        required: f.required,
        // no showIf from builder yet
      };
    });
  
    // UPDATED: Using localhost:5000 directly
    axios
    .post("https://form-builder-airtable-1.onrender.com/admin/forms/demo-form-1", {
        questions: extraQuestions, // ONLY extras, backend adds defaults
      })
      .then(() => {
        alert("Form saved! Go back to the form page and refresh.");
        console.log("Saved extra questions:", extraQuestions);
      })
      .catch((err) => {
        console.log("Save error", err);
        alert("Could not save form");
      });
  }
  
  return (
    <div style={{ width: 420, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h2 style={{ textAlign: "center", marginBottom: 20 }}>Form Builder</h2>

      <div style={{ marginBottom: 15 }}>
        <button onClick={addField}>➕ Add Field</button>
        <button onClick={onBack} style={{ marginLeft: 8 }}>
          ⬅ Back to Form
        </button>
        <button onClick={handleSave} style={{ marginLeft: 8 }}>
          💾 Save Form
        </button>
      </div>

      {fields.length === 0 && (
        <p style={{ fontSize: 13, color: "#555" }}>
          Click <b>“Add Field”</b> to start building your form.
        </p>
      )}

      {fields.map((field, index) => (
        <div
          key={field.key}
          style={{
            marginBottom: 12,
            padding: 10,
            border: "1px solid #ddd",
            borderRadius: 4,
          }}
        >
          <div style={{ fontSize: 13, color: "#444", marginBottom: 6 }}>
            Question {index + 1}
          </div>

          {/* question label */}
          <input
            value={field.label}
            placeholder="Type your question here"
            onChange={(e) => changeLabel(index, e.target.value)}
            style={{ width: "100%", padding: 6, marginBottom: 8 }}
          />

          {/* field type */}
          <select
            value={field.type}
            onChange={(e) => changeType(index, e.target.value)}
            style={{ padding: 6, width: "100%", marginBottom: 6 }}
          >
            <option value="text">Short Text</option>
            <option value="textarea">Long Text</option>
            <option value="select">Single Select</option>
            <option value="multiselect">Multi Select</option>
          </select>

          {/* required flag */}
          <label style={{ fontSize: 13 }}>
            <input
              type="checkbox"
              checked={field.required}
              onChange={() => toggleRequired(index)}
              style={{ marginRight: 4 }}
            />
            Required
          </label>
        </div>
      ))}
    </div>
  );
}

export default Builder;