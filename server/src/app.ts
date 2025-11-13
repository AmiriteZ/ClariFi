// server/src/app.ts
import express from "express";
import cors from "cors";
import dashboardRouter from "./routes/dashboard";

const app = express();

// Allow your frontend to call this API (for dev, we can allow all)
app.use(cors());
app.use(express.json());

// All API routes prefixed with /api
app.use("/api", dashboardRouter);

export default app;
