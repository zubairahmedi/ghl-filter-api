import express from "express";
import axios from "axios";

const router = express.Router();

router.post("/unassigned-count", async (req, res) => {
  try {
    // 🛡️ Read API key from header
    const apiKey = req.headers.apikey;
    if (!apiKey) return res.status(400).send("Missing API key");

    // 🧩 Parse body — can be single, multiple, or array of calendars
    let body = req.body?.trim?.() || "";
    if (!body) return res.type("text/plain").send("0");

    if (body.startsWith("{") && !body.includes("}{")) body = `[${body}]`;
    if (body.includes("}{")) body = "[" + body.replace(/}\s*{/g, "},{") + "]";

    let calendars;
    try {
      calendars = JSON.parse(body);
    } catch {
      return res.status(400).send("0");
    }

    if (!Array.isArray(calendars)) return res.status(400).send("0");

    // 📅 Define last 30 days window
    const end = Date.now();
    const start = end - 30 * 24 * 60 * 60 * 1000;

    let totalUnassigned = 0;

    // ⚙️ Sequentially loop through each calendar
    for (const cal of calendars) {
      const locationId = cal.locationId;
      const calendarId = cal.id;

      if (!calendarId || !locationId) continue;

      try {
        const { data } = await axios.get(
          "https://services.leadconnectorhq.com/calendars/events",
          {
            params: { locationId, calendarId, startTime: start, endTime: end },
            headers: {
              Accept: "application/json",
              Version: "2021-04-15",
              Authorization: `Bearer ${apiKey}`,
            },
          }
        );

        if (data?.events?.length) {
          const unassigned = data.events.filter(
            e => !e.assignedUserId
          ).length;
          totalUnassigned += unassigned;
        }
      } catch (err) {
        console.warn(
          `⚠️ Error fetching ${calendarId}:`,
          err.response?.status || err.message
        );
      }
    }

    // 🧮 Return only the count
    res.type("text/plain").send(String(totalUnassigned));
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.type("text/plain").status(500).send("0");
  }
});

export default router;
