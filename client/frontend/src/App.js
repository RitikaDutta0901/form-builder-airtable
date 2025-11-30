// client/frontend/src/App.js

import React, { useEffect, useState } from "react";
import axios from "axios";
import Builder from "./Builder";
import Responses from "./Responses";

// import helper from utils (shared conditional logic)
import { shouldShowQuestion } from "./conditionalLogic";

function App() {
  // "fill" = normal form, "builder" = form builder, "responses" = list of submissions
  const [screen, setScreen] = useState("fill");
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // load form from backend whenever we are on "fill" screen
  useEffect(() => {
    if (screen !== "fill") return;

    setLoading(true);
    setLoadError("");

    axios
      .get("http://localhost:5000/forms/demo-form-1")
      .then((res) => {
        setForm(res.data);
        setAnswers({});
        setSubmitted(false);
        setLoading(false);
      })
      .catch((err) => {
        console.log("Error loading form:", err.message);
        setLoadError("Could not load form from server.");
        setLoading(false);
      });
  }, [screen]);

  function handleChange(key, value) {
    setAnswers((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();

    axios
      .post("http://localhost:5000/forms/demo-form-1/submit", { answers })
      .then(() => {
        setSubmitted(true);
      })
      .catch((err) => {
        console.log("Submit error:", err.response?.data || err.message);
        alert("Submit failed. Please check console for details.");
      });
  }

  // ----------------- SCREEN SWITCHING -----------------

  if (screen === "builder") {
    return <Builder onBack={() => setScreen("fill")} />;
  }

  if (screen === "responses") {
    return <Responses onBack={() => setScreen("fill")} />;
  }

  if (loading) {
    return (
      <div style={{ width: 420, margin: "40px auto", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <button onClick={() => setScreen("builder")} style={{ marginRight: 8 }}>
            Open Form Builder
          </button>
          <button onClick={() => setScreen("responses")}>View Responses</button>
        </div>
        <h2>Loading form...</h2>
      </div>
    );
  }

  if (loadError || !form) {
    return (
      <div style={{ width: 420, margin: "40px auto", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <button onClick={() => setScreen("builder")} style={{ marginRight: 8 }}>
            Open Form Builder
          </button>
          <button onClick={() => setScreen("responses")}>View Responses</button>
        </div>
        <h2 style={{ marginTop: 20, color: "red" }}>
          {loadError || "Form not found"}
        </h2>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ width: 420, margin: "40px auto", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <button onClick={() => setScreen("builder")} style={{ marginRight: 8 }}>
            Open Form Builder
          </button>
          <button onClick={() => setScreen("responses")}>View Responses</button>
        </div>
        <h2 style={{ marginTop: 20 }}>🎉 Form submitted successfully!</h2>
      </div>
    );
  }

  // ----------------- NORMAL FORM VIEW -----------------

  return (
    <div style={{ width: 420, margin: "40px auto", fontFamily: "sans-serif" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <h2>{form.title}</h2>
        <div>
          <button
            onClick={() => setScreen("builder")}
            style={{ marginRight: 8 }}
          >
            Open Form Builder
          </button>
          <button onClick={() => setScreen("responses")}>View Responses</button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {form.questions
          // decide if a question should be visible
          .filter((q) => {
            // if we have proper conditionalRules, use the shared helper
            if (q.conditionalRules) {
              return shouldShowQuestion(q.conditionalRules, answers);
            }

            // fallback for old "showIf" shape (role-based)
            if (q.showIf && q.showIf.field && q.showIf.equals) {
              const value = (answers[q.showIf.field] || "")
                .toString()
                .trim()
                .toLowerCase();
              const needed = q.showIf.equals.toString().trim().toLowerCase();
              return value === needed;
            }

            // no rules → always show
            return true;
          })
          .map((q) => (
            <div key={q.questionKey} style={{ marginBottom: 15 }}>
              <label>{q.label}</label>
              <br />
              {/* for now, everything is a simple text input */}
              <input
                type="text"
                required={q.required}
                onChange={(e) => handleChange(q.questionKey, e.target.value)}
                style={{ width: "100%", padding: 8, marginTop: 4 }}
              />
            </div>
          ))}

        <button type="submit" style={{ padding: "8px 20px", marginTop: 10 }}>
          Submit
        </button>
      </form>

      <p style={{ marginTop: 18, fontSize: 12, color: "#555" }}>
        Hint: type <b>student</b> or <b>professional</b> in the role field to see extra
        fields.
      </p>
    </div>
  );
}

export default App;
