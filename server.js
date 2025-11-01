import express from "express";
const app = express();
app.use(express.json());

// Utility: check if a date is within last 30 days
function isWithinLast30Days(dateString) {
  if (!dateString) return false;
  const parsed = new Date(dateString);
  if (isNaN(parsed)) return false;

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  return parsed >= thirtyDaysAgo && parsed <= now;
}

// POST endpoint
app.post("/filter-contacts", (req, res) => {
  const contacts = req.body;
  if (!Array.isArray(contacts)) {
    return res.status(400).json({ error: "Expected an array of contacts" });
  }

  const recentContacts = contacts.filter(c => isWithinLast30Days(c.dateAdded));
  res.json({ count: recentContacts.length, contacts: recentContacts });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
