import express from "express";
const app = express();

// Read raw body manually to handle weird JSON streams
app.use(express.text({ type: "*/*", limit: "10mb" }));

// Helper: check if dateAdded is within last 30 days
function isWithinLast30Days(dateString) {
  if (!dateString) return false;
  const parsed = new Date(dateString);
  if (isNaN(parsed)) return false;

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  return parsed >= thirtyDaysAgo && parsed <= now;
}

app.post("/filter-contacts", (req, res) => {
  try {
    let body = req.body.trim();

    // Convert single object → array
    if (body.startsWith("{") && body.endsWith("}") && !body.includes("}{")) {
      body = `[${body}]`;
    }

    // Convert concatenated objects {...}{...}{...} → valid JSON array
    if (body.includes("}{")) {
      body = "[" + body.replace(/}\s*{/g, "},{") + "]";
    }

    const contacts = JSON.parse(body);
    if (!Array.isArray(contacts)) {
      return res.status(400).json({ error: "Expected an array or multiple JSON objects" });
    }

    // Filter only contacts added in the last 30 days
    const recentContacts = contacts.filter(c => isWithinLast30Days(c.dateAdded));

    // ✅ Only return the count
    return res.json({ count: recentContacts.length });

  } catch (err) {
    console.error("❌ JSON parsing error:", err.message);
    return res.status(400).json({ error: "Invalid or malformed JSON input" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
