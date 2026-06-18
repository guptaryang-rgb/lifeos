const { chromium } = require('./node_modules/playwright');
const path = require('path');

(async () => {
  console.log("🚀 Launching Chrome browser for Cloud Sync & Gemini API E2E Verification...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  
  const page = await context.newPage();
  
  try {
    console.log("🌐 Navigating to http://localhost:3000 to set up context...");
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    console.log("🧹 Clearing local storage & authenticating via API...");
    await page.evaluate(() => localStorage.clear());
    
    // Register test user (ignore if already exists)
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
    
    // Set localStorage user info — start as FREE user to test upgrade flow
    await page.evaluate(() => {
      localStorage.setItem('lifeos_user', JSON.stringify({
        name: 'Alex Chen',
        email: 'alex.chen@example.com',
        isPremium: false
      }));
      window.location.reload();
    });
    await page.waitForTimeout(2000);

    // Capture dashboard
    await page.screenshot({ path: path.join(__dirname, 'test-results/sync_dashboard_initial.png') });

    // 1. Trigger Premium upgrade via async checkout (demo mode)
    console.log("👑 Opening paywall and triggering Premium checkout (demo mode)...");
    await page.click('#btn-dashboard-premium');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(__dirname, 'test-results/paywall_modal_open.png') });
    
    // Click checkout — this now calls /api/stripe/checkout asynchronously.
    // In demo mode (no Stripe key), the API returns { demo: true } and the
    // frontend simulates the upgrade by setting isPremium in localStorage.
    await page.click('#btn-paywall-checkout');
    await page.waitForTimeout(3000); // Wait for async checkout + UI update
    await page.screenshot({ path: path.join(__dirname, 'test-results/paywall_upgraded.png') });

    // Verify Premium Badge — check localStorage since badge may update async
    const isPremium = await page.evaluate(() => {
      const user = JSON.parse(localStorage.getItem('lifeos_user') || '{}');
      return user.isPremium;
    });
    console.log("Premium status:", isPremium);
    if (!isPremium) {
      throw new Error("Premium status not set after checkout!");
    }

    // 2. Test Food and Workout Syncing
    console.log("🍎 Logging food via AI secretary to trigger auto-sync...");
    await page.fill('#companionInput', 'I ate 3 apples for snacks');
    await page.press('#companionInput', 'Enter');
    await page.waitForTimeout(2000);

    console.log("🏋️ Logging workout via AI secretary to trigger auto-sync...");
    await page.fill('#companionInput', 'I cycled for 45 minutes');
    await page.press('#companionInput', 'Enter');
    await page.waitForTimeout(2000);

    // 3. Test Finance Syncing
    console.log("💰 Logging expense via AI secretary to trigger auto-sync...");
    await page.fill('#companionInput', 'I spent $15 on coffee');
    await page.press('#companionInput', 'Enter');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(__dirname, 'test-results/sync_logged_all.png') });

    // 4. Directly test API endpoints via page.evaluate (fetch)
    console.log("🔍 Fetching API endpoints to verify synced logs on the server...");
    
    const foodLogs = await page.evaluate(async () => {
      const res = await fetch('/api/food');
      return res.json();
    });
    console.log("Fetched food logs:", foodLogs);
    if (foodLogs.length === 0 || !foodLogs.some(f => f.foodName.includes('Apple'))) {
      throw new Error("API /api/food did not return the synced food log!");
    }

    const workouts = await page.evaluate(async () => {
      const res = await fetch('/api/workouts');
      return res.json();
    });
    console.log("Fetched workouts:", workouts);
    if (workouts.length === 0 || !workouts.some(w => w.exerciseName.includes('Cycling'))) {
      throw new Error("API /api/workouts did not return the synced workout!");
    }

    const finance = await page.evaluate(async () => {
      const res = await fetch('/api/finance');
      return res.json();
    });
    console.log("Fetched transactions:", finance);
    if (finance.length === 0 || !finance.some(t => t.title.includes('Coffee'))) {
      throw new Error("API /api/finance did not return the synced transaction!");
    }

    console.log("🏁 Cloud Sync E2E Validation complete.");
    console.log("🎉 SUCCESS: All sync APIs verified successfully!");
    process.exit(0);

  } catch (e) {
    console.error("❌ CRITICAL FAILURE DURING SYNC E2E VERIFICATION:", e);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
