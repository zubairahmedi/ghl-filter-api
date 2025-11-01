import express from "express";
const router = express.Router();

/**
 * 🧮 Count appointments from raw JSON input
 * Accepts:
 * - Array of objects
 * - Concatenated objects {...}{...}{...}
 * - Single object
 * Returns: number only (plain text)
 */
router.post("/appointments-count", (req, res) => {
  try {
    let body = req.body.trim();

    // Handle single object → wrap in array
    if (body.startsWith("{") && body.endsWith("}") && !body.includes("}{")) {
      body = `[${body}]`;
    }

    // Handle concatenated objects {...}{...}{...}
    if (body.includes("}{")) {
      body = "[" + body.replace(/}\s*{/g, "},{") + "]";
    }

    // Try to parse it
    const appointments = JSON.parse(body);

    // Handle array or single object
    let count = 0;
    if (Array.isArray(appointments)) {
      count = appointments.length;
    } else if (appointments && typeof appointments === "object") {
      count = 1;
    }

    // ✅ Return plain count only
    res.type("text/plain").send(String(count));
  } catch (err) {
    console.error("❌ JSON parsing error:", err.message);
    res.type("text/plain").status(400).send("0");
  }
});

export default router;
