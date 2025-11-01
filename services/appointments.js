import express from "express";
import axios from "axios";
const router = express.Router();

router.get("/appointments-last30", async (req, res) => {
  const { calendarId, locationId } = req.query;
  if (!calendarId || !locationId)
    return res.status(400).send("Missing calendarId or locationId");

  const end = Date.now();
  const start = end - 30 * 24 * 60 * 60 * 1000;

  try {
    const { data } = await axios.get(
      "https://services.leadconnectorhq.com/calendars/events",
      {
        params: {
          calendarId,
          locationId,
          startTime: start,
          endTime: end
        },
        headers: {
          Accept: "application/json",
          Version: "2021-04-15",
          Authorization: `Bearer ${process.env.GHL_TOKEN}`
        }
      }
    );
    const count = Array.isArray(data.events) ? data.events.length : 0;
    res.type("text/plain").send(String(count));
  } catch (e) {
    console.error("❌", e.response?.data || e.message);
    res.type("text/plain").status(500).send("0");
  }
});

export default router;
