import express from "express";
import axios from "axios";

const router = express.Router();

router.post("/unassigned-count", async (req, res) => {
  try {
    const apiKey = req.headers.apikey;
    if (!apiKey) return res.status(400).send("Missing API key");

    let calendars;

    // 🧩 Handle both raw text and parsed JSON
    if (typeof req.body === "string") {
      let body = req.body.trim();

      // Some Make setups send multiple objects glued together — fix that
      if (body.startsWith("{") && body.includes("},{")) {
        body = "[" + body.replace(/}\s*,?\s*{/g, "},{") + "]";
      } else if (body.startsWith("{") && body.endsWith("}")) {
        body = "[" + body + "]";
      }

      calendars = JSON.parse(body);
    } else if (typeof req.body === "object") {
      calendars = Array.isArray(req.body) ? req.body : [req.body];
    } else {
      return res.status(400).send("Invalid body");
    }

    const end = Date.now();
    const start = end - 30 * 24 * 60 * 60 * 1000;
    let totalUnassigned = 0;

    for (const cal of calendars) {
      const { locationId, id: calendarId } = cal;
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
          totalUnassigned += data.events.filter(
            e => !e.assignedUserId
          ).length;
        }
      } catch (err) {
        console.warn(`⚠️ Calendar ${calendarId}:`, err.message);
      }
    }

    res.type("text/plain").send(String(totalUnassigned));
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).send("0");
  }
});

export default router;
