const http = require("http");

function verifyMLEndpoints() {
  console.log("Verifying ML endpoints...");

  const options = {
    hostname: "localhost",
    port: 5001,
    path: "/api/ml/snapshot",
    method: "GET",
  };

  const req = http.request(options, (res) => {
    console.log(`GET /ml/snapshot status: ${res.statusCode}`);

    if (res.statusCode === 404) {
      console.error("❌ Endpoint /ml/snapshot not found");
    } else if (res.statusCode === 401) {
      console.log("✅ Endpoint exists (Unauthorized as expected)");
    } else {
      console.log(`✅ Endpoint returned ${res.statusCode}`);
    }
  });

  req.on("error", (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  req.end();
}

verifyMLEndpoints();
