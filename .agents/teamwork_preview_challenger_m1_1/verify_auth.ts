import { loadEnvConfig } from "@next/env";
import * as path from "path";

// Load environment variables from the project root
const projectRoot = path.resolve(__dirname, "../..");
loadEnvConfig(projectRoot);

// Import authOptions using absolute/relative path
import { authOptions } from "../../src/lib/auth";

async function runTests() {
  // Find CredentialsProvider
  const provider: any = authOptions.providers.find(
    (p: any) => p.id === "credentials" || p.name === "Credentials"
  );

  if (!provider) {
    console.error("CredentialsProvider not found!");
    process.exit(1);
  }

  // NextAuth stores the actual user-defined authorize callback in options.authorize
  const authorizeFn = provider.options?.authorize || provider.authorize;
  if (!authorizeFn || authorizeFn.toString() === "() => null") {
    console.error("Could not find the actual user-defined authorize callback on the provider!");
    process.exit(1);
  }

  console.log("Found CredentialsProvider authorize callback. Starting authentication tests...");

  // Test Case 1: Correct Credentials
  try {
    const user = await authorizeFn({
      email: "user@example.com",
      password: "password123",
    }, {} as any);

    console.log("Test Case 1 (Correct Credentials):");
    console.log("Returned User:", user);

    if (user && user.email === "user@example.com" && user.name === "Test User" && typeof user.id === "string") {
      console.log("Case 1: SUCCESS - Correct user details returned.");
    } else {
      throw new Error(`Case 1: FAILED - Returned user details are incorrect or missing. Received: ${JSON.stringify(user)}`);
    }
  } catch (error) {
    console.error("Case 1: FAILED with error:", error);
    process.exit(1);
  }

  // Test Case 2: Incorrect Password
  try {
    console.log("\nTest Case 2 (Incorrect Password):");
    await authorizeFn({
      email: "user@example.com",
      password: "wrongpassword",
    }, {} as any);
    console.error("Case 2: FAILED - Expected an error to be thrown, but it succeeded.");
    process.exit(1);
  } catch (error: any) {
    console.log("Caught expected error:", error.message);
    if (error.message === "Invalid credentials") {
      console.log("Case 2: SUCCESS - Correctly threw 'Invalid credentials' error.");
    } else {
      console.error(`Case 2: FAILED - Threw unexpected error: ${error.message}`);
      process.exit(1);
    }
  }

  // Test Case 3: Non-existent User Email
  try {
    console.log("\nTest Case 3 (Non-existent Email):");
    await authorizeFn({
      email: "nonexistent@example.com",
      password: "password123",
    }, {} as any);
    console.error("Case 3: FAILED - Expected an error to be thrown, but it succeeded.");
    process.exit(1);
  } catch (error: any) {
    console.log("Caught expected error:", error.message);
    if (error.message === "Invalid credentials") {
      console.log("Case 3: SUCCESS - Correctly threw 'Invalid credentials' error.");
    } else {
      console.error(`Case 3: FAILED - Threw unexpected error: ${error.message}`);
      process.exit(1);
    }
  }

  // Test Case 4: Missing Email or Password
  try {
    console.log("\nTest Case 4 (Missing Fields):");
    await authorizeFn({
      email: "",
      password: "",
    }, {} as any);
    console.error("Case 4: FAILED - Expected an error to be thrown, but it succeeded.");
    process.exit(1);
  } catch (error: any) {
    console.log("Caught expected error:", error.message);
    if (error.message === "Missing email or password" || error.message === "Invalid credentials") {
      console.log("Case 4: SUCCESS - Correctly threw validation error.");
    } else {
      console.error(`Case 4: FAILED - Threw unexpected error: ${error.message}`);
      process.exit(1);
    }
  }

  console.log("\nVERDICT: ALL AUTHENTICATION TESTS PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error("Unhandled test execution error:", err);
  process.exit(1);
});
