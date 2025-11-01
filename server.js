import express from "express";
const app = express();

// Read raw body manually to handle GHL's weird JSON streams
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
      return res.status(400).send("0");
    }

    const recentContacts = contacts.filter(c => isWithinLast30Days(c.dateAdded));

    // ✅ Return only the number
    res.type("text/plain").send(String(recentContacts.length));
  } catch (err) {
    console.error("❌ JSON parsing error:", err.message);
    res.type("text/plain").status(400).send("0");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
