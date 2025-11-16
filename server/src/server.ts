import "dotenv/config";
import app from "./app";

const PORT = Number(process.env.PORT) || 5001;

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
