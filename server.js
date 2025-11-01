import express from "express";
import contactsRouter from "./services/contacts.js";
import appointmentsRouter from "./services/appointments.js";

const app = express();

// Handle plain JSON-like text from Make
app.use(express.text({ type: "*/*", limit: "10mb" }));

// Route requests to services
app.use("/", contactsRouter);
app.use("/", appointmentsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
