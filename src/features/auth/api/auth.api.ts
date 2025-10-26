export async function loginApi(email: string, password: string) {
  await new Promise((r) => setTimeout(r, 600)); // simulate delay
    const demo = { email: "demo@clarifi.app", password: "Demo1234!", name: "Demo User" };
  if (email === demo.email && password === demo.password) {
    return { token: "demo-token-abc123", user: { name: demo.name, email } };
  }
  throw new Error("Invalid email or password");
}
