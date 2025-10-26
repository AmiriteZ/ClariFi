export type LoginResponse = {
  token: string;
  user: {name: string; email: string};
};

export async function loginApi(email: string, password: string): Promise<LoginResponse> {

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 600));
  const demoEmail = {email: "demo@clarifi.app", password: "Demo1234!", name: "Demo User"};

  if (email === demoEmail.email && password === demoEmail.password) {
    return { token: "demo-token-abc123", user: { name: demoEmail.name, email } };
  } 

  throw new Error("Invalid email or password");
};