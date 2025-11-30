// client/frontend/src/Responses.js

import React, { useEffect, useState } from "react";
import axios from "axios";

function Responses({ onBack }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    setLoading(true);
    setLoadError("");

    axios
      .get("http://localhost:5000/forms/demo-form-1/responses")
      .then((res) => {
        setRows(res.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.log("Error loading responses:", err.message);
        setLoadError("Could not load responses");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ width: 800, margin: "40px auto", fontFamily: "sans-serif" }}>
        <button onClick={onBack}>← Back to form</button>
        <h2 style={{ marginTop: 20 }}>Loading responses...</h2>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ width: 800, margin: "40px auto", fontFamily: "sans-serif" }}>
        <button onClick={onBack}>← Back to form</button>
        <h2 style={{ marginTop: 20, color: "red" }}>{loadError}</h2>
      </div>
    );
  }

  return (
    <div style={{ width: 800, margin: "40px auto", fontFamily: "sans-serif" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <h2>Form Responses (demo-form-1)</h2>
        <button onClick={onBack}>← Back to form</button>
      </div>

      {rows.length === 0 ? (
        <p>No responses yet.</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  borderBottom: "1px solid #ddd",
                  textAlign: "left",
                  padding: 8,
                }}
              >
                ID
              </th>
              <th
                style={{
                  borderBottom: "1px solid #ddd",
                  textAlign: "left",
                  padding: 8,
                }}
              >
                Created
              </th>
              <th
                style={{
                  borderBottom: "1px solid #ddd",
                  textAlign: "left",
                  padding: 8,
                }}
              >
                Status
              </th>
              <th
                style={{
                  borderBottom: "1px solid #ddd",
                  textAlign: "left",
                  padding: 8,
                }}
              >
                Answers (preview)
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const status = r.deletedInAirtable ? "deleted in Airtable" : "active";

              let preview = "";
              try {
                preview = JSON.stringify(r.answers || {}, null, 0);
                if (preview.length > 80) {
                  preview = preview.slice(0, 80) + "...";
                }
              } catch (e) {
                preview = "[invalid answers]";
              }

              return (
                <tr key={r._id}>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: 8,
                      fontFamily: "monospace",
                      fontSize: 12,
                    }}
                  >
                    {r._id}
                  </td>
                  <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                    {status}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: 8,
                      fontFamily: "monospace",
                      fontSize: 12,
                    }}
                  >
                    {preview}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// IMPORTANT: default export, not an object, not named-only
export default Responses;
