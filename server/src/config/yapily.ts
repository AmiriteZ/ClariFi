export const YAPILY_CONFIG = {
  appId: process.env.YAPILY_APPLICATION_ID!,
  secret: process.env.YAPILY_APPLICATION_SECRET!,
  baseUrl: (process.env.YAPILY_BASE_URL || "https://api.yapily.com").replace(
    /\/$/,
    ""
  ),
};

export function yapilyAuthHeaders() {
  const basic = Buffer.from(
    `${YAPILY_CONFIG.appId}:${YAPILY_CONFIG.secret}`
  ).toString("base64");

  return {
    Authorization: `Basic ${basic}`,
    "Content-Type": "application/json",
  };
}
