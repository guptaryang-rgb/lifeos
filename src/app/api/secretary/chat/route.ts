import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

interface Action {
  type: string;
  data: any;
}

export async function POST(req: NextRequest) {
  const email = await getAuthenticatedUser();
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { message } = await req.json();
    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }

    // Gather today's date in local timezone YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0];

    // Fetch user context for today
    const [tasks, events, habits, foods, workouts, txs] = await Promise.all([
      prisma.task.findMany({ where: { user: { email } } }),
      prisma.event.findMany({ where: { user: { email } } }),
      prisma.habit.findMany({ where: { user: { email } } }),
      prisma.foodLog.findMany({ where: { user: { email }, date: todayStr } }),
      prisma.workout.findMany({ where: { user: { email }, date: todayStr } }),
      prisma.transaction.findMany({ where: { user: { email }, date: todayStr } })
    ]);

    // Format context summary
    const taskSummary = tasks.map(t => `- [${t.status}] ${t.title} (Priority: ${t.priority}, Due: ${t.dueDate ? t.dueDate.toISOString().split('T')[0] : 'None'})`).join('\n') || 'None';
    const eventSummary = events.map(e => `- ${e.title} (${new Date(e.startTime).toLocaleTimeString()} to ${new Date(e.endTime).toLocaleTimeString()})`).join('\n') || 'None';
    const habitSummary = habits.map(h => `- ${h.title}`).join('\n') || 'None';
    
    const consumedCal = foods.reduce((acc, f) => acc + f.calories, 0);
    const burnedCal = workouts.reduce((acc, w) => acc + w.calories, 0);
    const netCal = consumedCal - burnedCal;
    const foodSummary = foods.map(f => `- ${f.servingCount}x ${f.foodName} (${f.calories} cal, meal: ${f.meal})`).join('\n') || 'None';
    const workoutSummary = workouts.map(w => `- ${w.exerciseName} (${w.durationMinutes} mins, ${w.calories} cal burned)`).join('\n') || 'None';
    const txSummary = txs.map(t => `- [${t.type}] ${t.title}: $${t.amount} (category: ${t.category})`).join('\n') || 'None';

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // ── SMART LOCAL SIMULATOR FOR DEMO MODE ──────────────────────────────────
      const msg = message.toLowerCase().trim();
      let responseText = "I'm here to support you on your wellness journey! Let me know if you'd like to log a meal, a workout, log your expenses, or schedule tasks.";
      const actions: Action[] = [];

      // Regex matching for simulated inputs
      // 1. Water
      if (msg.includes('water') || msg.includes('glass') || msg.includes('drink')) {
        const match = msg.match(/(\d+)\s*glass/i) || msg.match(/drink\s*(\d+)/i) || msg.match(/(\d+)\s*water/i);
        const glasses = match ? parseInt(match[1]) : 1;
        actions.push({ type: 'log_water', data: { glasses } });
        responseText = `🥤 **Hydration Logged!** I've logged **${glasses} glass(es)** of water for you. Remember to aim for at least 8 glasses a day to keep your energy levels high!`;
      }
      // 2. Workout
      else if (msg.includes('run') || msg.includes('ran') || msg.includes('cycle') || msg.includes('bike') || msg.includes('gym') || msg.includes('lift') || msg.includes('walk') || msg.includes('workout') || msg.includes('exercise')) {
        const durationMatch = msg.match(/(\d+)\s*min/i) || msg.match(/(\d+)\s*hour/i);
        let duration = durationMatch ? parseInt(durationMatch[1]) : 30;
        if (msg.includes('hour') && !msg.includes('min')) duration *= 60;
        
        let type: 'cardio' | 'strength' = 'cardio';
        let exerciseName = 'Workout';
        let estCalories = duration * 8; // standard cardio estimation

        if (msg.includes('run') || msg.includes('ran')) { exerciseName = 'Running'; estCalories = duration * 11; }
        else if (msg.includes('cycle') || msg.includes('bike')) { exerciseName = 'Cycling'; estCalories = duration * 8; }
        else if (msg.includes('gym') || msg.includes('lift') || msg.includes('strength') || msg.includes('weight')) {
          exerciseName = 'Weightlifting';
          type = 'strength';
          estCalories = duration * 5;
        } else if (msg.includes('walk')) { exerciseName = 'Walking'; estCalories = duration * 4; }

        actions.push({
          type: 'log_workout',
          data: { exerciseName, type, durationMinutes: duration, calories: estCalories }
        });
        responseText = `💪 **Workout Saved!** Awesome job on that **${exerciseName}** for **${duration} mins**! I've logged **${estCalories} cal burned**. How are you feeling? Remember to stretch!`;
      }
      // 3. Food
      else if (msg.includes('ate') || msg.includes('eat') || msg.includes('had') || msg.includes('breakfast') || msg.includes('lunch') || msg.includes('dinner') || msg.includes('snack')) {
        const meal = msg.includes('breakfast') ? 'Breakfast' : msg.includes('lunch') ? 'Lunch' : msg.includes('dinner') ? 'Dinner' : 'Snacks';
        
        const detectedFoods = [];
        
        if (msg.includes('apple')) {
          detectedFoods.push({ foodName: 'Apple', calories: 285, protein: 1.5, carbs: 75, fat: 0.9, fiber: 13.2, servingCount: 3 });
        }
        if (msg.includes('egg')) {
          detectedFoods.push({ foodName: 'Eggs (whole)', calories: 144, protein: 12.6, carbs: 0.8, fat: 9.6, fiber: 0, servingCount: 2 });
        }
        if (msg.includes('banana')) {
          detectedFoods.push({ foodName: 'Banana', calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, servingCount: 1 });
        }
        if (msg.includes('coffee')) {
          detectedFoods.push({ foodName: 'Black Coffee', calories: 5, protein: 0, carbs: 0, fat: 0, fiber: 0, servingCount: 1 });
        }
        if (msg.includes('salad')) {
          detectedFoods.push({ foodName: 'Garden Salad', calories: 120, protein: 2, carbs: 10, fat: 8, fiber: 2, servingCount: 1 });
        }
        if (msg.includes('chicken') || msg.includes('breast')) {
          detectedFoods.push({ foodName: 'Grilled Chicken', calories: 220, protein: 35, carbs: 0, fat: 6, fiber: 0, servingCount: 1 });
        }

        if (detectedFoods.length > 0) {
          detectedFoods.forEach(f => {
            actions.push({
              type: 'log_food',
              data: { foodName: f.foodName, meal, servingCount: f.servingCount, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat }
            });
          });
          const foodNames = detectedFoods.map(f => f.foodName).join(' and ');
          const totalCals = detectedFoods.reduce((sum, f) => sum + f.calories, 0);
          responseText = `🍽️ **Nutrition Logged!** I've logged **${foodNames}** (${totalCals} calories total) for your **${meal}**. Balancing nutrition is key to staying sharp!`;
        } else {
          // Attempt extraction
          let foodName = 'Healthy Meal';
          let calories = 350;
          let protein = 15;
          let carbs = 40;
          let fat = 12;
          const foodMatch = msg.match(/ate\s+([a-zA-Z\s]+?)(?:\s+for|\s+at|\s+this|$)/i) || msg.match(/had\s+([a-zA-Z\s]+?)(?:\s+for|\s+at|\s+this|$)/i);
          if (foodMatch) foodName = foodMatch[1].trim();

          actions.push({
            type: 'log_food',
            data: { foodName, meal, servingCount: 1, calories, protein, carbs, fat }
          });
          responseText = `🍽️ **Nutrition Logged!** I've logged **1 serving of ${foodName}** (${calories} calories) for your **${meal}**. Balancing nutrition is key to staying sharp!`;
        }
      }
      // 4. Finance (Expense/Income)
      else if (msg.includes('spent') || msg.includes('spend') || msg.includes('bought') || msg.includes('$') || msg.includes('cost') || msg.includes('pay')) {
        const amtMatch = msg.match(/\$?(\d+(?:\.\d{2})?)/);
        const amount = amtMatch ? parseFloat(amtMatch[1]) : 10.0;
        let title = 'General Expense';
        let category = 'bills';

        if (msg.includes('coffee')) { title = 'Coffee'; category = 'food'; }
        else if (msg.includes('lunch') || msg.includes('dinner') || msg.includes('restaurant')) { title = 'Dining Out'; category = 'food'; }
        else if (msg.includes('uber') || msg.includes('taxi') || msg.includes('gas') || msg.includes('bus')) { title = 'Transport'; category = 'transport'; }
        else if (msg.includes('movie') || msg.includes('game') || msg.includes('netflix')) { title = 'Entertainment'; category = 'entertainment'; }

        let displayCategory = category.charAt(0).toUpperCase() + category.slice(1);
        if (category === 'transport') displayCategory = 'Transportation';

        actions.push({
          type: 'log_expense',
          data: { title, amount, category }
        });
        responseText = `💸 **Transaction Added!** Recorded a **$${amount.toFixed(2)}** expense for **${title}** under *${displayCategory}*. Keeping track of the small purchases makes a big difference!`;
      }
      // 5. Tasks & Todo
      else if (msg.includes('task') || msg.includes('todo') || msg.includes('remind me to') || msg.includes('add a reminder')) {
        let title = 'New Task';
        const taskMatch = msg.match(/remind me to\s+([a-zA-Z\s\d]+?)(?:\s+by|\s+at|\s+tomorrow|$)/i) || msg.match(/task to\s+([a-zA-Z\s\d]+?)(?:\s+by|\s+at|\s+tomorrow|$)/i);
        if (taskMatch) title = taskMatch[1].trim();
        
        let priority = 'medium';
        if (msg.includes('urgent') || msg.includes('asap') || msg.includes('important')) priority = 'high';

        let dueDate = todayStr;
        if (msg.includes('tomorrow')) dueDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        actions.push({
          type: 'add_task',
          data: { title, priority, dueDate }
        });
        responseText = `🎯 **Task Added!** I've scheduled **"${title}"** for your checklist. Let's make today productive, Alex!`;
      }
      // 6. Mood
      else if (msg.includes('feel') || msg.includes('mood') || msg.includes('happy') || msg.includes('sad') || msg.includes('tired')) {
        let mood: 'great' | 'good' | 'okay' | 'bad' | 'terrible' = 'good';
        if (msg.includes('happy') || msg.includes('great') || msg.includes('awesome') || msg.includes('amazing')) mood = 'great';
        else if (msg.includes('sad') || msg.includes('depressed') || msg.includes('terrible') || msg.includes('bad')) mood = 'terrible';
        else if (msg.includes('tired') || msg.includes('exhausted') || msg.includes('stressed')) mood = 'bad';
        else if (msg.includes('okay') || msg.includes('fine') || msg.includes('meh')) mood = 'okay';

        actions.push({
          type: 'log_mood',
          data: { mood, note: message }
        });
        responseText = `🧠 **Mood Recorded.** Thanks for sharing how you feel. Logging your emotional states regularly helps uncover triggers and supports your mental wellness. I'm here for you!`;
      }

      return NextResponse.json({
        success: true,
        demo: true,
        response: responseText,
        actions
      });
    }

    // ── GEMINI MULTI-MODAL THINKING COMPANION ────────────────────────────────
    const systemPrompt = `You are LifeOS AI Companion, a warm, empathetic, highly intelligent health, finance, and productivity coach.
Today is ${todayStr}.
You have access to the user's current day logs and context:

## Tasks:
${taskSummary}

## Schedule & Calendar Events:
${eventSummary}

## Active Habits:
${habitSummary}

## Nutrition & Fitness Status today:
- Consumed: ${consumedCal} calories
- Burned: ${burnedCal} calories
- Net Calories: ${netCal} calories
- Food Logs:
${foodSummary}
- Workouts:
${workoutSummary}

## Finance Transactions today:
${txSummary}

---
Your task is to respond to the user's message contextually, supportively, and intelligently.
If the user wants to schedule an event, add a task, log food/calories, log a workout, log water, log sleep, log mood, or log an expense/income, you must fulfill it by returning structured actions.

You must respond ONLY with a valid JSON object of the following format:
{
  "response": "Your warm, empathetic, executive-level companion response in markdown. Address the user by name (Alex Chen). Be proactive, offer helpful tips, and confirm what you logged for them in a natural, coaching tone. Keep it relatively concise but deeply engaging.",
  "actions": [
    // Array of database mutation actions to perform. Leave empty if no action is needed.
    // Allowed actions and their specific parameter structures:
    // 1. { "type": "add_task", "data": { "title": "string (task title)", "priority": "low"|"medium"|"high", "dueDate": "YYYY-MM-DD (optional)" } }
    // 2. { "type": "schedule_event", "data": { "title": "string", "date": "YYYY-MM-DD", "startTime": "HH:MM", "endTime": "HH:MM" } }
    // 3. { "type": "log_food", "data": { "foodName": "string", "meal": "Breakfast"|"Lunch"|"Dinner"|"Snacks", "servingCount": number, "calories": number (estimated if not explicitly told), "protein": number (g), "carbs": number (g), "fat": number (g) } }
    // 4. { "type": "log_workout", "data": { "exerciseName": "string", "type": "cardio"|"strength", "durationMinutes": number, "calories": number (estimated calorie burn) } }
    // 5. { "type": "log_expense", "data": { "title": "string", "amount": number, "category": "bills"|"food"|"transport"|"entertainment"|"shopping"|"health"|"other" } }
    // 6. { "type": "log_income", "data": { "title": "string", "amount": number, "category": "salary"|"freelance"|"investments"|"other" } }
    // 7. { "type": "log_habit", "data": { "habitTitle": "string", "completed": boolean } }
    // 8. { "type": "log_water", "data": { "glasses": number } }
    // 9. { "type": "log_mood", "data": { "mood": "great"|"good"|"okay"|"bad"|"terrible", "note": "string (optional)" } }
    // 10. { "type": "log_sleep", "data": { "hours": number, "quality": number (1 to 5 stars) } }
  ]
}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: systemPrompt },
              { text: `User request: "${message}"` }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `Gemini API returned error: ${errText}` }, { status: response.status });
    }

    const resJson = await response.json();
    const rawText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    
    // Parse Gemini JSON output safely
    let parsedData;
    try {
      parsedData = JSON.parse(rawText.trim());
    } catch (err) {
      console.error('Failed to parse Gemini JSON output:', rawText);
      parsedData = {
        response: rawText,
        actions: []
      };
    }

    return NextResponse.json({
      success: true,
      response: parsedData.response || "I have received your request.",
      actions: parsedData.actions || []
    });

  } catch (e: any) {
    console.error('[Secretary Chat API Error]:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
