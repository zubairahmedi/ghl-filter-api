import express from "express";
import axios from "axios";

const router = express.Router();

/*
  POST /unassigned-count

  Accepts either:
  A) Make-style array of "bundles" that already contain data.events:
     [
       { statusCode: 200, data: { events: [...] } },
       { statusCode: 200, data: { events: [...] } },
       ...
     ]
     -> We just count events where assignedUserId is falsy.

  B) A dump containing calendars (with id) and a locationId. Example:
     {
       "locationId": "...",
       "calendars": [{ "id": "abc" }, { "id": "def" }, ...]
       // or a big array of calendar objects that each have "id" and "locationId"
     }
     -> We fetch /calendars/events for each calendar and count where assignedUserId is falsy.

  Headers:
    apikey: <PIT token>       (or Authorization: Bearer <PIT-token>)
    x-start-ms: <epoch-ms>    (optional; default now-180d)
    x-end-ms:   <epoch-ms>    (optional; default now)

  Returns:
    text/plain count only.
*/

function coerceJSON(raw) {
  if (typeof raw === "object" && raw !== null) return raw;

  if (typeof raw === "string") {
    const s = raw.trim();

    // If Make sends concatenated JSON chunks without commas, normalize }{
    const maybeArray =
      s.includes("}{") ? "[" + s.replace(/}\s*{/g, "},{") + "]" : s;

    try {
      return JSON.parse(maybeArray);
    } catch {
      // Some Make steps send a single object that isn't wrapped in an array
      // or sends plain text; in that case, we just throw to be caught below.
      throw new Error("Invalid JSON body");
    }
  }

  throw new Error("Unsupported payload type");
}

function isFalsyAssignedUserId(v) {
  // We treat missing, null, '', undefined as "unassigned"
  return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
}

function extractEventsFromBundles(parsed) {
  // Accept: an array of bundles or a single bundle
  const bundles = Array.isArray(parsed) ? parsed : [parsed];
  const events = [];

  for (const b of bundles) {
    // Make's HTTP module usually puts events under b.data.events
    const maybeEvents = b?.data?.events;
    if (Array.isArray(maybeEvents)) {
      events.push(...maybeEvents);
    }
  }
  return events;
}

function extractCalendarsDump(parsed) {
  // We accept two patterns:
  // 1) { locationId, calendars: [ {id}, {id}, ... ] }
  // 2) An array of calendar-like objects each with id and locationId
  if (parsed && typeof parsed === "object" && parsed.locationId && Array.isArray(parsed.calendars)) {
    const ids = parsed.calendars
      .map(c => c && c.id)
      .filter(Boolean);
    return { locationId: parsed.locationId, calendarIds: ids };
  }

  if (Array.isArray(parsed)) {
    const ids = [];
    let loc = null;
    for (const c of parsed) {
      if (c && typeof c === "object") {
        if (!loc && c.locationId) loc = c.locationId;
        if (c.id) ids.push(c.id);
      }
    }
    if (ids.length && loc) return { locationId: loc, calendarIds: ids };
  }

  return null;
}

router.post("/unassigned-count", async (req, res) => {
  try {
    // Parse body as JSON or raw text
    let parsed;
    if (req.is("application/json")) {
      parsed = req.body;
    } else {
      parsed = coerceJSON(req.body);
    }

    // 1) If payload already contains events bundles -> count directly
    const embeddedEvents = extractEventsFromBundles(parsed);
    if (embeddedEvents.length > 0) {
      const count = embeddedEvents.reduce(
        (acc, ev) => acc + (isFalsyAssignedUserId(ev.assignedUserId) ? 1 : 0),
        0
      );
      return res.type("text/plain").send(String(count));
    }

    // 2) Otherwise, treat payload as calendars dump -> fetch per calendar
    const dump = extractCalendarsDump(parsed);
    if (!dump) {
      // Nothing we can do with the given payload
      return res.type("text/plain").status(400).send("0");
    }

    const apikey =
      req.header("apikey") ||
      (req.header("authorization") || "").replace(/^Bearer\s+/i, "").trim();

    if (!apikey) {
      return res.type("text/plain").status(401).send("0");
    }

    const now = Date.now();
    const endMs = Number(req.header("x-end-ms")) || now;
    const startMs =
      Number(req.header("x-start-ms")) || endMs - 180 * 24 * 60 * 60 * 1000; // default 180d

    let totalUnassigned = 0;

    // Be kind to rate limits: do requests sequentially
    for (const calendarId of dump.calendarIds) {
      try {
        const { data } = await axios.get(
          "https://services.leadconnectorhq.com/calendars/events",
          {
            params: {
              locationId: dump.locationId,
              calendarId,
              startTime: startMs,
              endTime: endMs
            },
            headers: {
              Accept: "application/json",
              Version: "2021-04-15",
              Authorization: `Bearer ${apikey}`
            },
            timeout: 30000
          }
        );

        const events = Array.isArray(data?.events) ? data.events : [];
        for (const ev of events) {
          if (isFalsyAssignedUserId(ev.assignedUserId)) {
            totalUnassigned += 1;
          }
        }
      } catch (err) {
        // Skip failed calendars but continue others
        // (If you prefer failing hard, change to return 500)
        // console.error("Calendar fetch failed", calendarId, err?.response?.status || err.message);
      }
    }

    return res.type("text/plain").send(String(totalUnassigned));
  } catch (e) {
    // console.error("❌ /unassigned-count error:", e.message);
    return res.type("text/plain").status(400).send("0");
  }
});

export default router;
