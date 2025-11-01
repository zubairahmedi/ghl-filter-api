import express from "express";
const app = express();

// We'll read the raw body manually
app.use(express.text({ type: "*/*", limit: "10mb" }));

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

    // If it's a single object, just parse normally
    if (body.startsWith("{") && body.endsWith("}") && !body.includes("}{")) {
      body = `[${body}]`;
    }

    // If it's multiple concatenated objects {...}{...}{...}
    // Split between }{ and rebuild as JSON array
    if (body.includes("}{")) {
      body = "[" + body.replace(/}\s*{/g, "},{") + "]";
    }

    const contacts = JSON.parse(body);
    if (!Array.isArray(contacts)) {
      return res.status(400).json({ error: "Expected an array or multiple JSON objects" });
    }

    const recentContacts = contacts.filter(c => isWithinLast30Days(c.dateAdded));

    return res.json({
      count: recentContacts.length,
      contacts: recentContacts,
    });
  } catch (err) {
    console.error("❌ JSON parsing error:", err.message);
    return res.status(400).json({ error: "Invalid or malformed JSON input" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
