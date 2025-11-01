import express from "express";
import contactsRouter from "./services/contacts.js";
import appointmentsRouter from "./services/appointments.js";
import unassignedRouter from "./services/unassigned.js"; // ← add this line

const app = express();

// 🧩 Use both parsers so text + JSON payloads both work
app.use(express.text({ type: "text/*", limit: "10mb" })); // for raw contact-style text
app.use(express.json({ limit: "20mb" }));                 // for JSON dumps from Make

// 🛣️ Route requests to individual service files
app.use("/", contactsRouter);
app.use("/", appointmentsRouter);
app.use("/", unassignedRouter); // ← mount new route

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
