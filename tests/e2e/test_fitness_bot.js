const { chromium } = require('./node_modules/playwright');
const path = require('path');

(async () => {
  console.log("🚀 Launching Chrome browser for Fitness & AI Secretary E2E Verification...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  
  const page = await context.newPage();
  
  // Monitor console errors and uncaught exceptions
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('❌ CONSOLE ERROR:', msg.text());
      consoleErrors.push(msg.text());
    } else {
      console.log('💬 CONSOLE LOG:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.error('❌ PAGE UNCAUGHT EXCEPTION:', err.message);
    consoleErrors.push(err.message);
  });

  try {
    console.log("🌐 Navigating to LifeOS Dev Server at http://localhost:3000 ...");
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    
    // Register and login to get a properly signed session cookie
    console.log("🧹 Clearing localStorage and authenticating via API...");
    await page.evaluate(async () => {
      localStorage.clear();
      await fetch('/api/test/reset', { method: 'POST' }).catch(() => {});
    });
    
    // Register test user
    await page.evaluate(async () => {
      await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'alex.chen@example.com', name: 'Alex Chen', password: 'testpass123' })
      }).catch(() => {});
    });
    
    // Login to get signed httpOnly session cookie
    const loginResult = await page.evaluate(async () => {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'alex.chen@example.com', password: 'testpass123' })
      });
      return { ok: res.ok, status: res.status };
    });
    console.log("🔐 Login result:", loginResult);
    
    // Set localStorage user info
    await page.evaluate(() => {
      localStorage.setItem('lifeos_user', JSON.stringify({
        name: 'Alex Chen',
        email: 'alex.chen@example.com',
        isPremium: true
      }));
      window.location.reload();
    });
    await page.waitForTimeout(2000);

    // Clear setup-phase console errors (e.g., duplicate registration 400 or unauthorized reset 401)
    consoleErrors.length = 0;

    // Capture initial dashboard
    console.log("📸 Capturing initial dashboard state...");
    await page.screenshot({ path: path.join(__dirname, 'test-results/dashboard_initial.png') });

    // 1. Test AI Secretary multi-food parsing
    console.log("💬 Testing AI Secretary: Compound Food Logging...");
    await page.fill('#companionInput', 'I ate 2 eggs and a banana for breakfast');
    await page.press('#companionInput', 'Enter');
    await page.waitForTimeout(1500);

    const foodResponse = await page.locator('.ai-companion-response').innerText();
    console.log("🤖 AI Response to food:", foodResponse);
    if (!foodResponse.includes('Eggs (whole)') || !foodResponse.includes('Banana')) {
      throw new Error("Food response did not confirm logging Eggs (whole) and Banana!");
    }
    await page.screenshot({ path: path.join(__dirname, 'test-results/companion_food_response.png') });

    // 2. Test AI Secretary expense auto-categorization
    console.log("💬 Testing AI Secretary: Expense Auto-Categorization...");
    await page.fill('#companionInput', 'I spent $12.50 on an Uber');
    await page.press('#companionInput', 'Enter');
    await page.waitForTimeout(1500);

    const expenseResponse = await page.locator('.ai-companion-response').innerText();
    console.log("🤖 AI Response to expense:", expenseResponse);
    if (!expenseResponse.includes('12.50') || !expenseResponse.includes('Transportation')) {
      throw new Error("Expense response did not confirm logging $12.50 under Transportation category!");
    }
    await page.screenshot({ path: path.join(__dirname, 'test-results/companion_expense_response.png') });

    // 3. Test AI Secretary workout parsing
    console.log("💬 Testing AI Secretary: Workout Logging & Calories Estimation...");
    await page.fill('#companionInput', 'I ran for 30 minutes');
    await page.press('#companionInput', 'Enter');
    await page.waitForTimeout(1500);

    const workoutResponse = await page.locator('.ai-companion-response').innerText();
    console.log("🤖 AI Response to workout:", workoutResponse);
    if (!workoutResponse.includes('Running') || !workoutResponse.includes('30 mins') || !workoutResponse.includes('cal burned')) {
      throw new Error("Workout response did not confirm logging Running for 30 mins with calories burned!");
    }
    await page.screenshot({ path: path.join(__dirname, 'test-results/companion_workout_response.png') });

    // Check dashboard net calories and workout list widget
    console.log("🔍 Checking Dashboard widgets for logged details...");
    const dashboardStats = await page.locator('#dashboardNutrition').innerText();
    console.log("📊 Dashboard nutrition card details:\n", dashboardStats);
    if (!dashboardStats.includes('Consumed') || !dashboardStats.includes('Burned') || !dashboardStats.includes('Net Calories')) {
      throw new Error("Dashboard nutrition card does not display Net Calories correctly!");
    }
    
    // 4. Navigate to Fitness & Nutrition Page
    console.log("🧭 Navigating to Fitness & Nutrition page...");
    await page.click('#nav-food');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(__dirname, 'test-results/fitness_nutrition_page.png') });

    // Verify dual-tab selector is present
    const tabsText = await page.locator('.food-tabs').innerText();
    console.log("Tabs present:", tabsText);
    if (!tabsText.includes('Nutrition') || !tabsText.includes('Fitness')) {
      throw new Error("Dual tabs (Nutrition & Fitness) are not rendered correctly!");
    }

    // Click Fitness tab
    console.log("🖱️ Clicking Fitness tab...");
    await page.click('#btn-tab-fitness');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(__dirname, 'test-results/fitness_tab_active.png') });

    // Log a workout manually in Fitness tab
    console.log("🏋️ Logging a manual Strength workout (Weightlifting)...");
    await page.click('#btn-type-strength');
    await page.waitForTimeout(500);
    await page.selectOption('#fit-name-select', 'Weightlifting');
    await page.fill('#fit-dur-input', '45');
    await page.fill('#fit-dist-weight-input', '150');
    await page.fill('#fit-sets-input', '4');
    await page.fill('#fit-reps-input', '10');
    await page.click('#fit-submit-btn');
    await page.waitForTimeout(1000);

    // Verify workout was added to list
    const fitnessPageContent = await page.locator('#page-food').innerHTML();
    if (!fitnessPageContent.includes('Weightlifting') || !fitnessPageContent.includes('45 mins')) {
      throw new Error("Logged strength workout is not displayed in the Fitness page workout list!");
    }
    console.log("✅ Strength workout confirmed in list!");
    await page.screenshot({ path: path.join(__dirname, 'test-results/fitness_workout_logged.png') });

    console.log("🏁 E2E Validation complete.");
    if (consoleErrors.length > 0) {
      console.log(`❌ FAIL: Found ${consoleErrors.length} console/page errors.`);
      process.exit(1);
    } else {
      console.log("🎉 SUCCESS: All verification steps passed with zero console errors!");
      process.exit(0);
    }
  } catch (e) {
    console.error("❌ CRITICAL FAILURE DURING E2E VERIFICATION:", e);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
