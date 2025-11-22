const fetch = require("node-fetch");

async function verifyMLEndpoints() {
  const baseUrl = "http://localhost:5001/api";
  // We need a valid token. For this test, we'll assume the server is running
  // and we might need to mock the auth or use a known user if possible.
  // However, since we can't easily get a valid Firebase token in this script without login,
  // we will check if the endpoint exists (401 Unauthorized is better than 404 Not Found).

  console.log("Verifying ML endpoints...");

  try {
    const res = await fetch(`${baseUrl}/ml/snapshot`);
    console.log(`GET /ml/snapshot status: ${res.status}`);

    if (res.status === 404) {
      console.error("❌ Endpoint /ml/snapshot not found");
    } else if (res.status === 401) {
      console.log("✅ Endpoint exists (Unauthorized as expected)");
    } else {
      console.log(`✅ Endpoint returned ${res.status}`);
    }
  } catch (err) {
    console.error("Error calling /ml/snapshot:", err.message);
  }
}

verifyMLEndpoints();
