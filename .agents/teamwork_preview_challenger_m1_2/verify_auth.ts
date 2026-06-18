import { authOptions } from "../../src/lib/auth";
import prisma from "../../src/lib/prisma";
import * as assert from "assert";

async function runTests() {
  console.log("--- Starting Verification Script ---");

  // 1. Verify Database Counts
  console.log("Verifying SQLite Database counts...");
  
  const userCount = await prisma.user.count();
  const goalCount = await prisma.goal.count();
  const milestoneCount = await prisma.milestone.count();
  const taskCount = await prisma.task.count();
  const eventCount = await prisma.event.count();
  const habitCount = await prisma.habit.count();
  const habitLogCount = await prisma.habitLog.count();
  const focusSessionCount = await prisma.focusSession.count();
  const snapshotCount = await prisma.analyticsSnapshot.count();
  const suggestionCount = await prisma.scheduleSuggestion.count();

  console.log(`User count: ${userCount} (Expected: 1)`);
  console.log(`Goal count: ${goalCount} (Expected: 3)`);
  console.log(`Milestone count: ${milestoneCount} (Expected: 8)`);
  console.log(`Task count: ${taskCount} (Expected: 25)`);
  console.log(`Event count: ${eventCount} (Expected: 25)`);
  console.log(`Habit count: ${habitCount} (Expected: 3)`);
  console.log(`HabitLog count: ${habitLogCount} (Expected: 28)`);
  console.log(`FocusSession count: ${focusSessionCount} (Expected: 8)`);
  console.log(`AnalyticsSnapshot count: ${snapshotCount} (Expected: 14)`);
  console.log(`ScheduleSuggestion count: ${suggestionCount} (Expected: 3)`);

  assert.strictEqual(userCount, 1, "User count mismatch");
  assert.strictEqual(goalCount, 3, "Goal count mismatch");
  assert.strictEqual(milestoneCount, 8, "Milestone count mismatch");
  assert.strictEqual(taskCount, 25, "Task count mismatch");
  assert.strictEqual(eventCount, 25, "Event count mismatch");
  assert.strictEqual(habitCount, 3, "Habit count mismatch");
  assert.strictEqual(habitLogCount, 28, "HabitLog count mismatch");
  assert.strictEqual(focusSessionCount, 8, "FocusSession count mismatch");
  assert.strictEqual(snapshotCount, 14, "AnalyticsSnapshot count mismatch");
  assert.strictEqual(suggestionCount, 3, "ScheduleSuggestion count mismatch");
  
  console.log("Database counts verified successfully!\n");

  // 2. Verify NextAuth authorize handler
  console.log("Verifying NextAuth authorize callback...");
  
  const credentialsProvider = authOptions.providers.find(
    (p: any) => p.id === "credentials" || p.name === "Credentials"
  ) as any;
  
  if (!credentialsProvider) {
    throw new Error("CredentialsProvider not found in authOptions");
  }

  // NextAuth stores the developer-defined options in options
  const authorize = credentialsProvider.options?.authorize || credentialsProvider.authorize;
  
  if (!authorize) {
    throw new Error("Authorize callback not found on CredentialsProvider");
  }

  console.log("Resolved authorize callback successfully.\n");

  // Test Case 2.1: Correct credentials
  console.log("Testing with correct credentials (user@example.com / password123)...");
  const result = await authorize({
    email: "user@example.com",
    password: "password123",
  }, {} as any);

  console.log("Result for correct credentials:", result);
  assert.ok(result, "Expected authorize to return a user object");
  assert.strictEqual(result.email, "user@example.com", "Email mismatch");
  assert.strictEqual(result.name, "Test User", "Name mismatch");
  assert.ok(result.id, "Expected user ID to be present");
  console.log("Test Case 2.1 Passed!\n");

  // Test Case 2.2: Incorrect password
  console.log("Testing with incorrect password...");
  try {
    await authorize({
      email: "user@example.com",
      password: "wrongpassword",
    }, {} as any);
    assert.fail("Expected authorize to throw an error for incorrect password");
  } catch (error: any) {
    console.log("Correctly threw error:", error.message);
    assert.strictEqual(error.message, "Invalid credentials", "Unexpected error message");
    console.log("Test Case 2.2 Passed!\n");
  }

  // Test Case 2.3: Incorrect email
  console.log("Testing with non-existent email...");
  try {
    await authorize({
      email: "nonexistent@example.com",
      password: "password123",
    }, {} as any);
    assert.fail("Expected authorize to throw an error for non-existent email");
  } catch (error: any) {
    console.log("Correctly threw error:", error.message);
    assert.strictEqual(error.message, "Invalid credentials", "Unexpected error message");
    console.log("Test Case 2.3 Passed!\n");
  }

  // Test Case 2.4: Missing credentials
  console.log("Testing with missing credentials...");
  try {
    await authorize({
      email: "",
      password: "",
    }, {} as any);
    assert.fail("Expected authorize to throw an error for missing credentials");
  } catch (error: any) {
    console.log("Correctly threw error:", error.message);
    assert.strictEqual(error.message, "Missing email or password", "Unexpected error message");
    console.log("Test Case 2.4 Passed!\n");
  }

  console.log("All NextAuth authorize callback tests passed successfully!");
}

runTests()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
