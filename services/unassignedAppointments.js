import express from "express";
import axios from "axios";
const router = express.Router();

/**
 * POST /unassigned-appointments-count
 * Body: {
 *   locationId: "jZzFZdSnV5OmH3KzPvJN",
 *   apiKey: "pit-xxxx",
 *   startTime: 1756731966718,
 *   endTime: 1762002366703,
 *   calendars: [ { id: "calendar1", ... }, { id: "calendar2", ... } ]
 * }
 *
 * ➤ Returns: plain number — count of events with no assignedUserId
 */
router.post("/unassigned-appointments-count", async (req, res) => {
  const { locationId, apiKey, startTime, endTime, calendars } = req.body;

  if (!locationId || !apiKey || !Array.isArray(calendars)) {
    return res
      .status(400)
      .type("text/plain")
      .send("0");
  }

  try {
    const calendarIds = calendars.map(c => c.id).filter(Boolean);

    console.log(`🔁 Checking ${calendarIds.length} calendars...`);

    // Run all API calls in parallel
    const results = await Promise.allSettled(
      calendarIds.map(id =>
        axios
          .get("https://services.leadconnectorhq.com/calendars/events", {
            params: { locationId, calendarId: id, startTime, endTime },
            headers: {
              Accept: "application/json",
              Version: "2021-04-15",
              Authorization: `Bearer ${apiKey}`,
            },
          })
          .then(r => r.data.events || [])
          .catch(err => {
            console.error(`❌ Calendar ${id} failed:`, err.response?.status || err.message);
            return [];
          })
      )
    );

    // Flatten all event arrays
    const allEvents = results
      .filter(r => r.status === "fulfilled")
      .flatMap(r => r.value);

    // Filter out ones with assignedUserId
    const unassignedEvents = allEvents.filter(e => !e.assignedUserId);

    // Return just the count as plain text
    res.type("text/plain").send(String(unassignedEvents.length));
  } catch (err) {
    console.error("🔥 Error:", err.message);
    res.type("text/plain").status(500).send("0");
  }
});

export default router;
