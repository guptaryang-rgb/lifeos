/* ═══════════════════════════════════════════════════════════════════════════
   LifeOS · Fitness & Nutrition Tracker
   ─────────────────────────────────────────────────────────────────────────
   Replaces MyFitnessPal. Camera-based food scanning, macro tracking,
   calorie ring, workout logging (cardio & strength), MET calorie estimation,
   weekly trends, and net calorie integration.
   localStorage keys: lifeos_food_log, lifeos_food_goals, lifeos_workouts
   ═══════════════════════════════════════════════════════════════════════════ */

const Food = (() => {
  'use strict';

  /* ── Constants ─────────────────────────────────────────────────────────── */
  const STORAGE_LOG       = 'lifeos_food_log';
  const STORAGE_GOALS     = 'lifeos_food_goals';
  const STORAGE_WORKOUTS  = 'lifeos_workouts';
  const CSS_ID            = 'lifeos-food-css';

  const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

  const MEAL_ICONS = {
    Breakfast: '🌅',
    Lunch:     '☀️',
    Dinner:    '🌙',
    Snacks:    '🍿'
  };

  /* ── Active Tab State ── */
  let _activeTab = 'nutrition'; // 'nutrition' or 'fitness'

  /* ── Active Workout Timer State ── */
  let _workoutInterval = null;
  let _workoutStartTime = null;
  let _workoutAccumulatedTime = 0; // ms
  let _workoutTimerState = 'idle'; // 'idle', 'running', 'paused'
  let _selectedWorkoutTimerType = 'Cardio';

  /* ── Food Database (110 items) ─────────────────────────────────────────── */
  const database = [
    // ── Fruits ──
    { name: 'Apple',              category: 'fruits',    calories: 95,  protein: 0.5,  carbs: 25,   fat: 0.3,  fiber: 4.4,  servingSize: 1,   servingUnit: 'medium',  icon: '🍎' },
    { name: 'Banana',             category: 'fruits',    calories: 105, protein: 1.3,  carbs: 27,   fat: 0.4,  fiber: 3.1,  servingSize: 1,   servingUnit: 'medium',  icon: '🍌' },
    { name: 'Orange',             category: 'fruits',    calories: 62,  protein: 1.2,  carbs: 15,   fat: 0.2,  fiber: 3.1,  servingSize: 1,   servingUnit: 'medium',  icon: '🍊' },
    { name: 'Strawberries',       category: 'fruits',    calories: 49,  protein: 1,    carbs: 12,   fat: 0.5,  fiber: 3,    servingSize: 1,   servingUnit: 'cup',     icon: '🍓' },
    { name: 'Blueberries',        category: 'fruits',    calories: 84,  protein: 1.1,  carbs: 21,   fat: 0.5,  fiber: 3.6,  servingSize: 1,   servingUnit: 'cup',     icon: '🫐' },
    { name: 'Grapes',             category: 'fruits',    calories: 104, protein: 1.1,  carbs: 27,   fat: 0.2,  fiber: 1.4,  servingSize: 1,   servingUnit: 'cup',     icon: '🍇' },
    { name: 'Watermelon',         category: 'fruits',    calories: 86,  protein: 1.7,  carbs: 22,   fat: 0.4,  fiber: 1.1,  servingSize: 2,   servingUnit: 'cups',    icon: '🍉' },
    { name: 'Mango',              category: 'fruits',    calories: 99,  protein: 1.4,  carbs: 25,   fat: 0.6,  fiber: 2.6,  servingSize: 1,   servingUnit: 'cup',     icon: '🥭' },
    { name: 'Pineapple',          category: 'fruits',    calories: 82,  protein: 0.9,  carbs: 22,   fat: 0.2,  fiber: 2.3,  servingSize: 1,   servingUnit: 'cup',     icon: '🍍' },
    { name: 'Avocado',            category: 'fruits',    calories: 240, protein: 3,    carbs: 13,   fat: 22,   fiber: 10,   servingSize: 1,   servingUnit: 'whole',   icon: '🥑' },
    { name: 'Peach',              category: 'fruits',    calories: 59,  protein: 1.4,  carbs: 14,   fat: 0.4,  fiber: 2.3,  servingSize: 1,   servingUnit: 'medium',  icon: '🍑' },
    { name: 'Pear',               category: 'fruits',    calories: 101, protein: 0.7,  carbs: 27,   fat: 0.2,  fiber: 5.5,  servingSize: 1,   servingUnit: 'medium',  icon: '🍐' },

    // ── Vegetables ──
    { name: 'Broccoli',           category: 'vegetables', calories: 55,  protein: 3.7,  carbs: 11,   fat: 0.6,  fiber: 5.1,  servingSize: 1,   servingUnit: 'cup',    icon: '🥦' },
    { name: 'Spinach (raw)',      category: 'vegetables', calories: 7,   protein: 0.9,  carbs: 1.1,  fat: 0.1,  fiber: 0.7,  servingSize: 1,   servingUnit: 'cup',    icon: '🥬' },
    { name: 'Carrot',             category: 'vegetables', calories: 25,  protein: 0.6,  carbs: 6,    fat: 0.1,  fiber: 1.7,  servingSize: 1,   servingUnit: 'medium', icon: '🥕' },
    { name: 'Sweet Potato',       category: 'vegetables', calories: 103, protein: 2.3,  carbs: 24,   fat: 0.1,  fiber: 3.8,  servingSize: 1,   servingUnit: 'medium', icon: '🍠' },
    { name: 'Tomato',             category: 'vegetables', calories: 22,  protein: 1.1,  carbs: 4.8,  fat: 0.2,  fiber: 1.5,  servingSize: 1,   servingUnit: 'medium', icon: '🍅' },
    { name: 'Cucumber',           category: 'vegetables', calories: 16,  protein: 0.7,  carbs: 3.6,  fat: 0.1,  fiber: 0.5,  servingSize: 1,   servingUnit: 'cup',    icon: '🥒' },
    { name: 'Bell Pepper',        category: 'vegetables', calories: 31,  protein: 1,    carbs: 6,    fat: 0.3,  fiber: 2.1,  servingSize: 1,   servingUnit: 'medium', icon: '🫑' },
    { name: 'Corn on the Cob',    category: 'vegetables', calories: 88,  protein: 3.3,  carbs: 19,   fat: 1.4,  fiber: 2,    servingSize: 1,   servingUnit: 'ear',    icon: '🌽' },
    { name: 'Mushrooms',          category: 'vegetables', calories: 15,  protein: 2.2,  carbs: 2.3,  fat: 0.2,  fiber: 0.7,  servingSize: 1,   servingUnit: 'cup',    icon: '🍄' },
    { name: 'Onion',              category: 'vegetables', calories: 44,  protein: 1.2,  carbs: 10,   fat: 0.1,  fiber: 1.9,  servingSize: 1,   servingUnit: 'medium', icon: '🧅' },
    { name: 'Lettuce (iceberg)',  category: 'vegetables', calories: 10,  protein: 0.6,  carbs: 2.2,  fat: 0.1,  fiber: 0.9,  servingSize: 1,   servingUnit: 'cup',    icon: '🥬' },
    { name: 'Cauliflower',        category: 'vegetables', calories: 27,  protein: 2.1,  carbs: 5.3,  fat: 0.3,  fiber: 2.1,  servingSize: 1,   servingUnit: 'cup',    icon: '🥦' },

    // ── Grains & Bread ──
    { name: 'White Rice (cooked)', category: 'grains',   calories: 206, protein: 4.3,  carbs: 45,   fat: 0.4,  fiber: 0.6,  servingSize: 1,   servingUnit: 'cup',    icon: '🍚' },
    { name: 'Brown Rice (cooked)', category: 'grains',   calories: 216, protein: 5,    carbs: 45,   fat: 1.8,  fiber: 3.5,  servingSize: 1,   servingUnit: 'cup',    icon: '🍚' },
    { name: 'Oatmeal',            category: 'grains',    calories: 154, protein: 5.3,  carbs: 27,   fat: 2.6,  fiber: 4,    servingSize: 1,   servingUnit: 'cup',    icon: '🥣' },
    { name: 'Whole Wheat Bread',   category: 'grains',   calories: 81,  protein: 4,    carbs: 14,   fat: 1.1,  fiber: 1.9,  servingSize: 1,   servingUnit: 'slice',  icon: '🍞' },
    { name: 'White Bread',        category: 'grains',    calories: 75,  protein: 2.7,  carbs: 14,   fat: 1,    fiber: 0.6,  servingSize: 1,   servingUnit: 'slice',  icon: '🍞' },
    { name: 'Pasta (cooked)',     category: 'grains',    calories: 220, protein: 8.1,  carbs: 43,   fat: 1.3,  fiber: 2.5,  servingSize: 1,   servingUnit: 'cup',    icon: '🍝' },
    { name: 'Tortilla (flour)',   category: 'grains',    calories: 146, protein: 3.6,  carbs: 25,   fat: 3.5,  fiber: 1.3,  servingSize: 1,   servingUnit: 'large',  icon: '🫓' },
    { name: 'Quinoa (cooked)',    category: 'grains',    calories: 222, protein: 8.1,  carbs: 39,   fat: 3.6,  fiber: 5.2,  servingSize: 1,   servingUnit: 'cup',    icon: '🥣' },
    { name: 'Granola',            category: 'grains',    calories: 200, protein: 4,    carbs: 30,   fat: 8,    fiber: 3,    servingSize: 0.5, servingUnit: 'cup',    icon: '🥣' },
    { name: 'Bagel',              category: 'grains',    calories: 277, protein: 10.7, carbs: 54,   fat: 1.6,  fiber: 2.3,  servingSize: 1,   servingUnit: 'medium', icon: '🥯' },

    // ── Protein ──
    { name: 'Chicken Breast',     category: 'protein',   calories: 165, protein: 31,   carbs: 0,    fat: 3.6,  fiber: 0,    servingSize: 4,   servingUnit: 'oz',     icon: '🍗' },
    { name: 'Ground Beef (85%)',  category: 'protein',   calories: 218, protein: 24,   carbs: 0,    fat: 13,   fiber: 0,    servingSize: 4,   servingUnit: 'oz',     icon: '🥩' },
    { name: 'Salmon Fillet',      category: 'protein',   calories: 208, protein: 28,   carbs: 0,    fat: 10,   fiber: 0,    servingSize: 4,   servingUnit: 'oz',     icon: '🐟' },
    { name: 'Tuna (canned)',      category: 'protein',   calories: 120, protein: 26,   carbs: 0,    fat: 1,    fiber: 0,    servingSize: 4,   servingUnit: 'oz',     icon: '🐟' },
    { name: 'Shrimp',             category: 'protein',   calories: 99,  protein: 24,   carbs: 0.2,  fat: 0.3,  fiber: 0,    servingSize: 4,   servingUnit: 'oz',     icon: '🦐' },
    { name: 'Turkey Breast',      category: 'protein',   calories: 125, protein: 26,   carbs: 0,    fat: 1.8,  fiber: 0,    servingSize: 4,   servingUnit: 'oz',     icon: '🦃' },
    { name: 'Pork Chop',          category: 'protein',   calories: 231, protein: 27,   carbs: 0,    fat: 13,   fiber: 0,    servingSize: 4,   servingUnit: 'oz',     icon: '🥩' },
    { name: 'Tofu (firm)',        category: 'protein',   calories: 183, protein: 20,   carbs: 5,    fat: 11,   fiber: 2.9,  servingSize: 1,   servingUnit: 'cup',    icon: '🧈' },
    { name: 'Eggs (whole)',       category: 'protein',   calories: 72,  protein: 6.3,  carbs: 0.4,  fat: 4.8,  fiber: 0,    servingSize: 1,   servingUnit: 'large',  icon: '🥚' },
    { name: 'Egg Whites',         category: 'protein',   calories: 17,  protein: 3.6,  carbs: 0.2,  fat: 0.1,  fiber: 0,    servingSize: 1,   servingUnit: 'large',  icon: '🥚' },
    { name: 'Bacon',              category: 'protein',   calories: 43,  protein: 3,    carbs: 0.1,  fat: 3.3,  fiber: 0,    servingSize: 1,   servingUnit: 'slice',  icon: '🥓' },
    { name: 'Steak (sirloin)',    category: 'protein',   calories: 207, protein: 30,   carbs: 0,    fat: 9,    fiber: 0,    servingSize: 4,   servingUnit: 'oz',     icon: '🥩' },
    { name: 'Protein Powder',     category: 'protein',   calories: 120, protein: 24,   carbs: 3,    fat: 1.5,  fiber: 1,    servingSize: 1,   servingUnit: 'scoop',  icon: '🥤' },

    // ── Dairy ──
    { name: 'Whole Milk',         category: 'dairy',     calories: 149, protein: 8,    carbs: 12,   fat: 8,    fiber: 0,    servingSize: 1,   servingUnit: 'cup',    icon: '🥛' },
    { name: 'Skim Milk',          category: 'dairy',     calories: 83,  protein: 8.3,  carbs: 12,   fat: 0.2,  fiber: 0,    servingSize: 1,   servingUnit: 'cup',    icon: '🥛' },
    { name: 'Greek Yogurt (plain)', category: 'dairy',   calories: 130, protein: 17,   carbs: 6,    fat: 4.5,  fiber: 0,    servingSize: 1,   servingUnit: 'cup',    icon: '🥛' },
    { name: 'Cheddar Cheese',     category: 'dairy',     calories: 113, protein: 7,    carbs: 0.4,  fat: 9.3,  fiber: 0,    servingSize: 1,   servingUnit: 'oz',     icon: '🧀' },
    { name: 'Mozzarella Cheese',  category: 'dairy',     calories: 85,  protein: 6.3,  carbs: 0.7,  fat: 6.3,  fiber: 0,    servingSize: 1,   servingUnit: 'oz',     icon: '🧀' },
    { name: 'Cottage Cheese',     category: 'dairy',     calories: 206, protein: 28,   carbs: 6,    fat: 9,    fiber: 0,    servingSize: 1,   servingUnit: 'cup',    icon: '🧀' },
    { name: 'Butter',             category: 'dairy',     calories: 102, protein: 0.1,  carbs: 0,    fat: 11.5, fiber: 0,    servingSize: 1,   servingUnit: 'tbsp',   icon: '🧈' },
    { name: 'Cream Cheese',       category: 'dairy',     calories: 51,  protein: 0.9,  carbs: 0.8,  fat: 5,    fiber: 0,    servingSize: 1,   servingUnit: 'tbsp',   icon: '🧀' },
    { name: 'Ice Cream (vanilla)', category: 'dairy',    calories: 137, protein: 2.3,  carbs: 16,   fat: 7.3,  fiber: 0.5,  servingSize: 0.5, servingUnit: 'cup',    icon: '🍨' },

    // ── Snacks ──
    { name: 'Almonds',            category: 'snacks',    calories: 164, protein: 6,    carbs: 6,    fat: 14,   fiber: 3.5,  servingSize: 1,   servingUnit: 'oz',     icon: '🥜' },
    { name: 'Peanut Butter',      category: 'snacks',    calories: 188, protein: 8,    carbs: 6,    fat: 16,   fiber: 2,    servingSize: 2,   servingUnit: 'tbsp',   icon: '🥜' },
    { name: 'Trail Mix',          category: 'snacks',    calories: 175, protein: 5,    carbs: 16,   fat: 11,   fiber: 2,    servingSize: 0.25,servingUnit: 'cup',    icon: '🥜' },
    { name: 'Potato Chips',       category: 'snacks',    calories: 152, protein: 2,    carbs: 15,   fat: 10,   fiber: 1.3,  servingSize: 1,   servingUnit: 'oz',     icon: '🥔' },
    { name: 'Popcorn (air-popped)', category: 'snacks',  calories: 31,  protein: 1,    carbs: 6.2,  fat: 0.4,  fiber: 1.2,  servingSize: 1,   servingUnit: 'cup',    icon: '🍿' },
    { name: 'Dark Chocolate',     category: 'snacks',    calories: 170, protein: 2.2,  carbs: 13,   fat: 12,   fiber: 3.1,  servingSize: 1,   servingUnit: 'oz',     icon: '🍫' },
    { name: 'Protein Bar',        category: 'snacks',    calories: 210, protein: 20,   carbs: 23,   fat: 8,    fiber: 3,    servingSize: 1,   servingUnit: 'bar',    icon: '🍫' },
    { name: 'Granola Bar',        category: 'snacks',    calories: 140, protein: 3,    carbs: 22,   fat: 5,    fiber: 2,    servingSize: 1,   servingUnit: 'bar',    icon: '🍫' },
    { name: 'Crackers (whole wheat)', category: 'snacks', calories: 118, protein: 3, carbs: 20,   fat: 3,    fiber: 3,    servingSize: 5,   servingUnit: 'crackers', icon: '🍘' },
    { name: 'Hummus',             category: 'snacks',    calories: 70,  protein: 2,    carbs: 6,    fat: 4.5,  fiber: 1.5,  servingSize: 2,   servingUnit: 'tbsp',   icon: '🫕' },
    { name: 'Pretzels',           category: 'snacks',    calories: 110, protein: 3,    carbs: 23,   fat: 1,    fiber: 1,    servingSize: 1,   servingUnit: 'oz',     icon: '🥨' },
    { name: 'Rice Cakes',         category: 'snacks',    calories: 35,  protein: 0.7,  carbs: 7.3,  fat: 0.3,  fiber: 0.4,  servingSize: 1,   servingUnit: 'cake',   icon: '🍘' },

    // ── Drinks ──
    { name: 'Black Coffee',       category: 'drinks',    calories: 2,   protein: 0.3,  carbs: 0,    fat: 0,    fiber: 0,    servingSize: 8,   servingUnit: 'fl oz',  icon: '☕' },
    { name: 'Latte (whole milk)', category: 'drinks',    calories: 150, protein: 8,    carbs: 12,   fat: 8,    fiber: 0,    servingSize: 12,  servingUnit: 'fl oz',  icon: '☕' },
    { name: 'Orange Juice',       category: 'drinks',    calories: 112, protein: 1.7,  carbs: 26,   fat: 0.5,  fiber: 0.5,  servingSize: 8,   servingUnit: 'fl oz',  icon: '🧃' },
    { name: 'Coca-Cola',          category: 'drinks',    calories: 140, protein: 0,    carbs: 39,   fat: 0,    fiber: 0,    servingSize: 12,  servingUnit: 'fl oz',  icon: '🥤' },
    { name: 'Smoothie (fruit)',   category: 'drinks',    calories: 180, protein: 3,    carbs: 42,   fat: 0.5,  fiber: 3.5,  servingSize: 12,  servingUnit: 'fl oz',  icon: '🥤' },
    { name: 'Green Tea',          category: 'drinks',    calories: 0,   protein: 0,    carbs: 0,    fat: 0,    fiber: 0,    servingSize: 8,   servingUnit: 'fl oz',  icon: '🍵' },
    { name: 'Protein Shake',      category: 'drinks',    calories: 160, protein: 30,   carbs: 5,    fat: 2.5,  fiber: 1,    servingSize: 12,  servingUnit: 'fl oz',  icon: '🥤' },
    { name: 'Sports Drink',       category: 'drinks',    calories: 80,  protein: 0,    carbs: 21,   fat: 0,    fiber: 0,    servingSize: 12,  servingUnit: 'fl oz',  icon: '🧃' },
    { name: 'Almond Milk',        category: 'drinks',    calories: 30,  protein: 1,    carbs: 1,    fat: 2.5,  fiber: 0,    servingSize: 8,   servingUnit: 'fl oz',  icon: '🥛' },
    { name: 'Beer',               category: 'drinks',    calories: 153, protein: 1.6,  carbs: 13,   fat: 0,    fiber: 0,    servingSize: 12,  servingUnit: 'fl oz',  icon: '🍺' },
    { name: 'Red Wine',           category: 'drinks',    calories: 125, protein: 0.1,  carbs: 4,    fat: 0,    fiber: 0,    servingSize: 5,   servingUnit: 'fl oz',  icon: '🍷' },

    // ── Fast Food & Prepared ──
    { name: 'Pizza Slice (pepperoni)', category: 'fast_food', calories: 298, protein: 12, carbs: 34, fat: 13,  fiber: 2.3, servingSize: 1, servingUnit: 'slice', icon: '🍕' },
    { name: 'Cheeseburger',       category: 'fast_food', calories: 354, protein: 20,   carbs: 29,   fat: 18,   fiber: 1.5,  servingSize: 1,   servingUnit: 'burger', icon: '🍔' },
    { name: 'Chicken Nuggets',    category: 'fast_food', calories: 286, protein: 14,   carbs: 18,   fat: 18,   fiber: 1,    servingSize: 6,   servingUnit: 'pieces', icon: '🍗' },
    { name: 'French Fries',       category: 'fast_food', calories: 365, protein: 4,    carbs: 44,   fat: 19,   fiber: 4,    servingSize: 1,   servingUnit: 'medium', icon: '🍟' },
    { name: 'Hot Dog',            category: 'fast_food', calories: 290, protein: 10,   carbs: 24,   fat: 17,   fiber: 1,    servingSize: 1,   servingUnit: 'hot dog', icon: '🌭' },
    { name: 'Burrito',            category: 'fast_food', calories: 450, protein: 22,   carbs: 48,   fat: 18,   fiber: 5,    servingSize: 1,   servingUnit: 'burrito', icon: '🌯' },
    { name: 'Taco',               category: 'fast_food', calories: 170, protein: 9,    carbs: 13,   fat: 10,   fiber: 2,    servingSize: 1,   servingUnit: 'taco',   icon: '🌮' },
    { name: 'Fried Chicken Sandwich', category: 'fast_food', calories: 480, protein: 24, carbs: 42, fat: 22, fiber: 2,    servingSize: 1,   servingUnit: 'sandwich', icon: '🍔' },
    { name: 'Sub Sandwich (6")',  category: 'fast_food', calories: 350, protein: 18,   carbs: 42,   fat: 12,   fiber: 3,    servingSize: 1,   servingUnit: '6-inch', icon: '🥪' },
    { name: 'Sushi Roll (8pc)',   category: 'fast_food', calories: 255, protein: 9,    carbs: 38,   fat: 7,    fiber: 3.5,  servingSize: 8,   servingUnit: 'pieces', icon: '🍣' },
    { name: 'Ramen (instant)',    category: 'fast_food', calories: 380, protein: 8,    carbs: 52,   fat: 14,   fiber: 2,    servingSize: 1,   servingUnit: 'packet', icon: '🍜' },
    { name: 'Mac & Cheese',       category: 'fast_food', calories: 310, protein: 11,   carbs: 40,   fat: 12,   fiber: 1.5,  servingSize: 1,   servingUnit: 'cup',    icon: '🧀' },
    { name: 'Fried Rice',         category: 'fast_food', calories: 238, protein: 6,    carbs: 35,   fat: 8,    fiber: 1.2,  servingSize: 1,   servingUnit: 'cup',    icon: '🍚' },
    { name: 'Chicken Caesar Salad', category: 'fast_food', calories: 360, protein: 28, carbs: 14,   fat: 22,   fiber: 3,    servingSize: 1,   servingUnit: 'bowl',   icon: '🥗' },

    // ── Miscellaneous / Condiments ──
    { name: 'Olive Oil',          category: 'misc',      calories: 119, protein: 0,    carbs: 0,    fat: 13.5, fiber: 0,    servingSize: 1,   servingUnit: 'tbsp',   icon: '🫒' },
    { name: 'Honey',              category: 'misc',      calories: 64,  protein: 0.1,  carbs: 17,   fat: 0,    fiber: 0,    servingSize: 1,   servingUnit: 'tbsp',   icon: '🍯' },
    { name: 'Ketchup',            category: 'misc',      calories: 20,  protein: 0.2,  carbs: 5,    fat: 0,    fiber: 0,    servingSize: 1,   servingUnit: 'tbsp',   icon: '🍅' },
    { name: 'Mayonnaise',         category: 'misc',      calories: 94,  protein: 0.1,  carbs: 0.1,  fat: 10,   fiber: 0,    servingSize: 1,   servingUnit: 'tbsp',   icon: '🥄' },
    { name: 'Ranch Dressing',     category: 'misc',      calories: 73,  protein: 0.4,  carbs: 1,    fat: 7.7,  fiber: 0,    servingSize: 1,   servingUnit: 'tbsp',   icon: '🥄' },
    { name: 'Soy Sauce',          category: 'misc',      calories: 8,   protein: 1.3,  carbs: 0.8,  fat: 0,    fiber: 0.1,  servingSize: 1,   servingUnit: 'tbsp',   icon: '🥄' },
    { name: 'Salsa',              category: 'misc',      calories: 10,  protein: 0.5,  carbs: 2,    fat: 0.1,  fiber: 0.5,  servingSize: 2,   servingUnit: 'tbsp',   icon: '🫙' },

    // ── Breakfast Items ──
    { name: 'Pancakes',           category: 'grains',    calories: 175, protein: 5,    carbs: 22,   fat: 7,    fiber: 1,    servingSize: 2,   servingUnit: 'medium', icon: '🥞' },
    { name: 'Waffle',             category: 'grains',    calories: 218, protein: 6,    carbs: 25,   fat: 11,   fiber: 1.7,  servingSize: 1,   servingUnit: 'large',  icon: '🧇' },
    { name: 'Cereal (Cheerios)',  category: 'grains',    calories: 100, protein: 3,    carbs: 20,   fat: 2,    fiber: 3,    servingSize: 1,   servingUnit: 'cup',    icon: '🥣' },
    { name: 'English Muffin',     category: 'grains',    calories: 132, protein: 5,    carbs: 26,   fat: 1,    fiber: 2,    servingSize: 1,   servingUnit: 'muffin', icon: '🍞' },

    // ── Legumes ──
    { name: 'Black Beans',        category: 'protein',   calories: 227, protein: 15,   carbs: 41,   fat: 0.9,  fiber: 15,   servingSize: 1,   servingUnit: 'cup',    icon: '🫘' },
    { name: 'Lentils (cooked)',   category: 'protein',   calories: 230, protein: 18,   carbs: 40,   fat: 0.8,  fiber: 15.6, servingSize: 1,   servingUnit: 'cup',    icon: '🫘' },
    { name: 'Chickpeas',          category: 'protein',   calories: 269, protein: 14.5, carbs: 45,   fat: 4.2,  fiber: 12.5, servingSize: 1,   servingUnit: 'cup',    icon: '🫘' },
  ];

  /* ── Workout Database & Catalog ── */
  const DEFAULT_EXERCISES = [
    { name: 'Running',       type: 'cardio',   met: 9.8,  icon: '🏃' },
    { name: 'Cycling',       type: 'cardio',   met: 7.5,  icon: '🚴' },
    { name: 'Swimming',      type: 'cardio',   met: 5.8,  icon: '🏊' },
    { name: 'Walking',       type: 'cardio',   met: 3.8,  icon: '🚶' },
    { name: 'Weightlifting', type: 'strength', met: 5.0,  icon: '🏋️' },
    { name: 'Yoga',          type: 'strength', met: 2.5,  icon: '🧘' },
    { name: 'HIIT',          type: 'cardio',   met: 8.0,  icon: '⚡' },
  ];

  /* ── Helpers ────────────────────────────────────────────────────────────── */
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  const dateStr = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  };

  const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
  };

  const esc = (s) => typeof escHtml === 'function' ? escHtml(s) : s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  /* ── Storage ────────────────────────────────────────────────────────────── */
  const loadLog       = () => { try { return JSON.parse(localStorage.getItem(STORAGE_LOG)) || []; } catch { return []; } };
  const saveLog       = (d) => localStorage.setItem(STORAGE_LOG, JSON.stringify(d));
  const loadGoals     = () => { try { return JSON.parse(localStorage.getItem(STORAGE_GOALS)) || null; } catch { return null; } };
  const saveGoals     = (g) => localStorage.setItem(STORAGE_GOALS, JSON.stringify(g));
  const loadWorkouts  = () => { try { return JSON.parse(localStorage.getItem(STORAGE_WORKOUTS)) || []; } catch { return []; } };
  const saveWorkouts  = (w) => localStorage.setItem(STORAGE_WORKOUTS, JSON.stringify(w));

  const DEFAULT_GOALS = { calories: 2000, protein: 150, carbs: 250, fat: 65 };

  /* ── Workout Logging Core ── */
  const calculateCaloriesBurned = (exerciseName, durationMin, weightLbs = 150) => {
    const ex = DEFAULT_EXERCISES.find(e => e.name.toLowerCase() === exerciseName.toLowerCase()) || { met: 5.0 };
    const weightKg = weightLbs * 0.45359237;
    const durationHours = durationMin / 60;
    return Math.round(ex.met * weightKg * durationHours);
  };

  let _syncing = false;
  async function performSync(refreshCb) {
    if (_syncing) return;
    _syncing = true;
    let changed = false;
    try {
      const res = await fetch('/api/food');
      if (res.ok) {
        const serverLogs = await res.json();
        if (Array.isArray(serverLogs)) {
          const local = loadLog();
          const localCount = local.length;
          const localMap = new Map(local.map(item => [item.id, item]));
          serverLogs.forEach(item => {
            localMap.set(item.id, {
              id: item.id,
              foodName: item.foodName,
              calories: item.calories,
              protein: item.protein,
              carbs: item.carbs,
              fat: item.fat,
              fiber: item.fiber,
              meal: item.meal,
              servingCount: item.servingCount,
              date: item.date,
              timestamp: item.timestamp || new Date().toISOString()
            });
          });
          const merged = Array.from(localMap.values());
          if (merged.length !== localCount || serverLogs.length !== localCount) {
            saveLog(merged);
            changed = true;
          }
          const serverIds = new Set(serverLogs.map(item => item.id));
          for (const item of local) {
            if (!serverIds.has(item.id)) {
              await fetch('/api/food', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Food sync error:', e);
    }

    try {
      const res = await fetch('/api/workouts');
      if (res.ok) {
        const serverWorkouts = await res.json();
        if (Array.isArray(serverWorkouts)) {
          const local = loadWorkouts();
          const localCount = local.length;
          const localMap = new Map(local.map(item => [item.id, item]));
          serverWorkouts.forEach(item => {
            localMap.set(item.id, {
              id: item.id,
              exerciseName: item.exerciseName,
              type: item.type,
              icon: item.icon || '💪',
              durationMinutes: item.durationMinutes,
              distance: item.distance,
              sets: item.sets,
              reps: item.reps,
              weight: item.weight,
              calories: item.calories,
              date: item.date,
              timestamp: item.timestamp || new Date().toISOString()
            });
          });
          const merged = Array.from(localMap.values());
          if (merged.length !== localCount || serverWorkouts.length !== localCount) {
            saveWorkouts(merged);
            changed = true;
          }
          const serverIds = new Set(serverWorkouts.map(item => item.id));
          for (const item of local) {
            if (!serverIds.has(item.id)) {
              await fetch('/api/workouts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Workouts sync error:', e);
    }

    _syncing = false;
    if (changed && refreshCb) {
      refreshCb();
    }
  }

  const workouts = {
    add(w) {
      const all = loadWorkouts();
      const calories = w.calories ?? calculateCaloriesBurned(w.exerciseName, w.durationMinutes);
      const ex = DEFAULT_EXERCISES.find(e => e.name.toLowerCase() === w.exerciseName.toLowerCase()) || { type: w.type || 'cardio', icon: '💪' };
      const entry = {
        id: uid(),
        exerciseName: w.exerciseName,
        type: ex.type,
        icon: ex.icon,
        durationMinutes: parseInt(w.durationMinutes) || 0,
        distance: w.distance ? parseFloat(w.distance) : null,
        sets: w.sets ? parseInt(w.sets) : null,
        reps: w.reps ? parseInt(w.reps) : null,
        weight: w.weight ? parseInt(w.weight) : null,
        calories: parseInt(calories) || 0,
        date: w.date || today(),
        timestamp: w.timestamp || new Date().toISOString()
      };
      all.push(entry);
      saveWorkouts(all);
      performSync();
      return entry;
    },
    remove(id) {
      const all = loadWorkouts().filter(w => w.id !== id);
      saveWorkouts(all);
      performSync();
    },
    getToday() {
      const t = today();
      return loadWorkouts().filter(w => w.date === t);
    },
    getByDate(d) {
      return loadWorkouts().filter(w => w.date === d);
    },
    getTodayBurned() {
      return this.getToday().reduce((s, w) => s + w.calories, 0);
    },
    getWeeklyTrend() {
      const trend = [];
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const d = daysAgo(i);
        const dStr = dateStr(d);
        const dayWorkouts = loadWorkouts().filter(w => w.date === dStr);
        const cals = dayWorkouts.reduce((s, w) => s + w.calories, 0);
        trend.push({
          dayLabel: days[d.getDay()],
          date: dStr,
          calories: cals
        });
      }
      return trend;
    },
    seedIfNeeded() {
      if (loadWorkouts().length > 0) return;
      const wList = [
        { exerciseName: 'Running', durationMinutes: 30, distance: 3.1, calories: 330, date: dateStr(daysAgo(0)) },
        { exerciseName: 'Weightlifting', durationMinutes: 45, sets: 4, reps: 10, weight: 135, calories: 230, date: dateStr(daysAgo(1)) },
        { exerciseName: 'Cycling', durationMinutes: 45, distance: 10.0, calories: 390, date: dateStr(daysAgo(2)) },
        { exerciseName: 'Yoga', durationMinutes: 30, calories: 90, date: dateStr(daysAgo(3)) },
        { exerciseName: 'Running', durationMinutes: 20, distance: 2.0, calories: 220, date: dateStr(daysAgo(4)) },
        { exerciseName: 'Weightlifting', durationMinutes: 60, sets: 5, reps: 8, weight: 155, calories: 300, date: dateStr(daysAgo(5)) },
      ];
      wList.forEach(w => this.add(w));
    }
  };

  /* ── Seed Data (7 days) ────────────────────────────────────────────────── */
  function seedIfNeeded() {
    const hasLog = loadLog().length > 0;
    if (hasLog) {
      workouts.seedIfNeeded();
      return;
    }

    const mealPlans = [
      /* Day 0 (today) */
      [
        { food: 'Oatmeal',          meal: 'Breakfast', servings: 1 },
        { food: 'Banana',           meal: 'Breakfast', servings: 1 },
        { food: 'Black Coffee',     meal: 'Breakfast', servings: 1 },
        { food: 'Chicken Caesar Salad', meal: 'Lunch', servings: 1 },
        { food: 'Orange Juice',     meal: 'Lunch',     servings: 1 },
        { food: 'Salmon Fillet',    meal: 'Dinner',    servings: 1 },
        { food: 'Brown Rice (cooked)', meal: 'Dinner', servings: 1 },
        { food: 'Broccoli',         meal: 'Dinner',    servings: 1 },
        { food: 'Dark Chocolate',   meal: 'Snacks',    servings: 1 },
        { food: 'Almonds',          meal: 'Snacks',    servings: 1 },
      ],
      /* Day 1 */
      [
        { food: 'Eggs (whole)',      meal: 'Breakfast', servings: 3 },
        { food: 'Whole Wheat Bread', meal: 'Breakfast', servings: 2 },
        { food: 'Latte (whole milk)', meal: 'Breakfast', servings: 1 },
        { food: 'Burrito',          meal: 'Lunch',     servings: 1 },
        { food: 'Coca-Cola',        meal: 'Lunch',     servings: 1 },
        { food: 'Pasta (cooked)',   meal: 'Dinner',    servings: 1.5 },
        { food: 'Ground Beef (85%)', meal: 'Dinner',   servings: 1 },
        { food: 'Protein Bar',      meal: 'Snacks',    servings: 1 },
      ],
      /* Day 2 */
      [
        { food: 'Greek Yogurt (plain)', meal: 'Breakfast', servings: 1 },
        { food: 'Blueberries',      meal: 'Breakfast', servings: 1 },
        { food: 'Granola',          meal: 'Breakfast', servings: 1 },
        { food: 'Sub Sandwich (6")', meal: 'Lunch',    servings: 1 },
        { food: 'Apple',            meal: 'Lunch',     servings: 1 },
        { food: 'Chicken Breast',   meal: 'Dinner',    servings: 1.5 },
        { food: 'Sweet Potato',     meal: 'Dinner',    servings: 1 },
        { food: 'Spinach (raw)',    meal: 'Dinner',    servings: 2 },
        { food: 'Protein Shake',    meal: 'Snacks',    servings: 1 },
      ],
      /* Day 3 */
      [
        { food: 'Pancakes',         meal: 'Breakfast', servings: 1 },
        { food: 'Bacon',            meal: 'Breakfast', servings: 3 },
        { food: 'Orange Juice',     meal: 'Breakfast', servings: 1 },
        { food: 'Pizza Slice (pepperoni)', meal: 'Lunch', servings: 2 },
        { food: 'Green Tea',        meal: 'Lunch',     servings: 1 },
        { food: 'Steak (sirloin)',  meal: 'Dinner',    servings: 1.5 },
        { food: 'Quinoa (cooked)',  meal: 'Dinner',    servings: 1 },
        { food: 'Carrot',           meal: 'Dinner',    servings: 2 },
        { food: 'Ice Cream (vanilla)', meal: 'Snacks', servings: 1 },
      ],
      /* Day 4 */
      [
        { food: 'Cereal (Cheerios)', meal: 'Breakfast', servings: 1.5 },
        { food: 'Whole Milk',       meal: 'Breakfast', servings: 1 },
        { food: 'Sushi Roll (8pc)', meal: 'Lunch',     servings: 1.5 },
        { food: 'Green Tea',        meal: 'Lunch',     servings: 1 },
        { food: 'Tofu (firm)',      meal: 'Dinner',    servings: 1 },
        { food: 'Fried Rice',       meal: 'Dinner',    servings: 1 },
        { food: 'Mushrooms',        meal: 'Dinner',    servings: 1 },
        { food: 'Trail Mix',        meal: 'Snacks',    servings: 1 },
        { food: 'Peanut Butter',    meal: 'Snacks',    servings: 1 },
      ],
      /* Day 5 */
      [
        { food: 'Bagel',            meal: 'Breakfast', servings: 1 },
        { food: 'Cream Cheese',     meal: 'Breakfast', servings: 2 },
        { food: 'Black Coffee',     meal: 'Breakfast', servings: 2 },
        { food: 'Chicken Nuggets',  meal: 'Lunch',     servings: 1 },
        { food: 'French Fries',     meal: 'Lunch',     servings: 1 },
        { food: 'Lentils (cooked)', meal: 'Dinner',    servings: 1 },
        { food: 'White Rice (cooked)', meal: 'Dinner', servings: 1 },
        { food: 'Granola Bar',      meal: 'Snacks',    servings: 1 },
        { food: 'Strawberries',     meal: 'Snacks',    servings: 1 },
      ],
      /* Day 6 */
      [
        { food: 'Waffle',           meal: 'Breakfast', servings: 1 },
        { food: 'Honey',            meal: 'Breakfast', servings: 2 },
        { food: 'Smoothie (fruit)', meal: 'Breakfast', servings: 1 },
        { food: 'Cheeseburger',     meal: 'Lunch',     servings: 1 },
        { food: 'Coca-Cola',        meal: 'Lunch',     servings: 1 },
        { food: 'Tuna (canned)',    meal: 'Dinner',    servings: 1 },
        { food: 'Whole Wheat Bread', meal: 'Dinner',   servings: 2 },
        { food: 'Tomato',           meal: 'Dinner',    servings: 1 },
        { food: 'Popcorn (air-popped)', meal: 'Snacks', servings: 3 },
        { food: 'Red Wine',         meal: 'Snacks',    servings: 1 },
      ],
    ];

    const entries = [];
    mealPlans.forEach((plan, dayIdx) => {
      const d = daysAgo(dayIdx);
      const mealTimes = { Breakfast: 8, Lunch: 12, Dinner: 18, Snacks: 15 };
      plan.forEach(item => {
        const food = database.find(f => f.name === item.food);
        if (!food) return;
        const ts = new Date(d);
        ts.setHours(mealTimes[item.meal] + Math.random() * 1.5, Math.floor(Math.random() * 60));
        entries.push({
          id: uid(),
          foodName: food.name,
          icon: food.icon,
          calories: Math.round(food.calories * item.servings),
          protein: Math.round(food.protein * item.servings * 10) / 10,
          carbs: Math.round(food.carbs * item.servings * 10) / 10,
          fat: Math.round(food.fat * item.servings * 10) / 10,
          fiber: Math.round(food.fiber * item.servings * 10) / 10,
          meal: item.meal,
          servingCount: item.servings,
          servingSize: food.servingSize,
          servingUnit: food.servingUnit,
          timestamp: ts.toISOString(),
          date: dateStr(ts),
        });
      });
    });
    saveLog(entries);
    workouts.seedIfNeeded();
  }

  /* ── Log Methods ────────────────────────────────────────────────────────── */
  const log = {
    add(entry) {
      const all = loadLog();
      const food = database.find(f => f.name === entry.foodName);
      const sv = entry.servingCount || 1;
      const rec = {
        id: uid(),
        foodName: entry.foodName,
        icon: food ? food.icon : '🍽️',
        calories: entry.calories ?? Math.round((food?.calories || 0) * sv),
        protein:  entry.protein  ?? Math.round((food?.protein  || 0) * sv * 10) / 10,
        carbs:    entry.carbs    ?? Math.round((food?.carbs    || 0) * sv * 10) / 10,
        fat:      entry.fat      ?? Math.round((food?.fat      || 0) * sv * 10) / 10,
        fiber:    entry.fiber    ?? Math.round((food?.fiber    || 0) * sv * 10) / 10,
        meal: entry.meal || 'Snacks',
        servingCount: sv,
        servingSize: food?.servingSize || 1,
        servingUnit: food?.servingUnit || 'serving',
        timestamp: entry.timestamp || new Date().toISOString(),
        date: entry.date || today(),
      };
      all.push(rec);
      saveLog(all);
      performSync();
      return rec;
    },
    remove(id) {
      const all = loadLog().filter(e => e.id !== id);
      saveLog(all);
      performSync();
    },
    getToday()       { return loadLog().filter(e => e.date === today()); },
    getByDate(date)  { return loadLog().filter(e => e.date === date); },
    getThisWeek() {
      const dates = [];
      for (let i = 0; i < 7; i++) dates.push(dateStr(daysAgo(i)));
      return loadLog().filter(e => dates.includes(e.date));
    },
  };

  /* ── Goals ──────────────────────────────────────────────────────────────── */
  const goals = {
    get() { return loadGoals() || { ...DEFAULT_GOALS }; },
    set(g) { saveGoals({ ...this.get(), ...g }); },
  };

  /* ── Search (fuzzy) ─────────────────────────────────────────────────────── */
  function search(query) {
    if (!query || !query.trim()) return database.slice(0, 20);
    const q = query.toLowerCase().trim();
    const exact  = [];
    const starts = [];
    const has    = [];
    database.forEach(f => {
      const n = f.name.toLowerCase();
      if (n === q) exact.push(f);
      else if (n.startsWith(q)) starts.push(f);
      else if (n.includes(q) || f.category.includes(q)) has.push(f);
    });
    return [...exact, ...starts, ...has];
  }

  /* ── Analytics ──────────────────────────────────────────────────────────── */
  const analytics = {
    getTodaySummary() {
      const entries = log.getToday();
      const g = goals.get();
      const mealData = {};
      MEALS.forEach(m => { mealData[m] = { calories: 0, protein: 0, carbs: 0, fat: 0, items: [] }; });
      let totalCal = 0, totalP = 0, totalC = 0, totalF = 0, totalFi = 0;
      entries.forEach(e => {
        totalCal += e.calories; totalP += e.protein; totalC += e.carbs; totalF += e.fat; totalFi += (e.fiber || 0);
        if (mealData[e.meal]) {
          mealData[e.meal].calories += e.calories;
          mealData[e.meal].protein += e.protein;
          mealData[e.meal].carbs += e.carbs;
          mealData[e.meal].fat += e.fat;
          mealData[e.meal].items.push(e);
        }
      });
      return {
        totalCalories: Math.round(totalCal),
        protein: Math.round(totalP * 10) / 10,
        carbs: Math.round(totalC * 10) / 10,
        fat: Math.round(totalF * 10) / 10,
        fiber: Math.round(totalFi * 10) / 10,
        remaining: Math.max(0, g.calories - totalCal),
        goalCalories: g.calories,
        goalProtein: g.protein,
        goalCarbs: g.carbs,
        goalFat: g.fat,
        meals: mealData,
      };
    },
    getWeeklyTrend() {
      const trend = [];
      for (let i = 6; i >= 0; i--) {
        const d = dateStr(daysAgo(i));
        const dayEntries = log.getByDate(d);
        const cal = dayEntries.reduce((s, e) => s + e.calories, 0);
        const dt = daysAgo(i);
        trend.push({
          date: d,
          dayLabel: dt.toLocaleDateString('en-US', { weekday: 'short' }),
          calories: Math.round(cal),
        });
      }
      return trend;
    },
    getMacroBreakdown() {
      const s = this.getTodaySummary();
      const total = s.protein * 4 + s.carbs * 4 + s.fat * 9;
      return {
        protein: { grams: s.protein, pct: total ? Math.round(s.protein * 4 / total * 100) : 0 },
        carbs:   { grams: s.carbs,   pct: total ? Math.round(s.carbs * 4 / total * 100) : 0 },
        fat:     { grams: s.fat,     pct: total ? Math.round(s.fat * 9 / total * 100) : 0 },
      };
    },
    getStreak() {
      let streak = 0;
      for (let i = 0; i < 365; i++) {
        const d = dateStr(daysAgo(i));
        const dayEntries = log.getByDate(d);
        if (dayEntries.length > 0) streak++;
        else break;
      }
      return streak;
    },
  };

  /* ── CSS Injection ──────────────────────────────────────────────────────── */
  function injectCSS() {
    if (document.getElementById(CSS_ID)) return;
    const style = document.createElement('style');
    style.id = CSS_ID;
    style.textContent = `
/* ── Food Tracker Layout ──────────────────────────────────────────────── */
.food-tracker { max-width: 600px; margin: 0 auto; padding: 4px 0 80px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
.food-tracker * { box-sizing: border-box; }

/* ── Tabs ── */
.food-tabs { display: flex; gap: 12px; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0px; }
.food-tab-btn {
  background: none; border: none; color: rgba(255,255,255,0.5); font-size: 1rem; font-weight: 700;
  padding: 10px 16px; cursor: pointer; position: relative; transition: color .2s;
}
.food-tab-btn:hover { color: #fff; }
.food-tab-btn.active { color: var(--accent-primary-light, #a29bfe) !important; }
.food-tab-btn.active::after {
  content: ''; position: absolute; bottom: 0; left: 16px; right: 16px; height: 3px;
  background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%); border-radius: 2px;
}

/* ── Summary Card ─────────────────────────────────────────────────────── */
.food-summary-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px; padding: 24px; color: #fff; margin-bottom: 16px;
  display: flex; align-items: center; gap: 24px;
}
.food-calorie-ring { position: relative; flex-shrink: 0; width: 130px; height: 130px; }
.food-calorie-ring svg { transform: rotate(-90deg); }
.food-calorie-ring .ring-label {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  text-align: center; line-height: 1.2;
}
.food-calorie-ring .ring-label .cal-num { font-size: 26px; font-weight: 800; display: block; }
.food-calorie-ring .ring-label .cal-sub { font-size: 11px; opacity: .8; }
.food-macros { flex: 1; display: flex; flex-direction: column; gap: 10px; }
.food-macro-bar { display: flex; align-items: center; gap: 8px; }
.food-macro-bar .macro-label { width: 60px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
.food-macro-bar .macro-track { flex: 1; height: 8px; background: rgba(255,255,255,.25); border-radius: 4px; overflow: hidden; }
.food-macro-bar .macro-fill { height: 100%; border-radius: 4px; transition: width .4s ease; }
.food-macro-bar .macro-fill.protein { background: #00e5ff; }
.food-macro-bar .macro-fill.carbs   { background: #ffd740; }
.food-macro-bar .macro-fill.fat     { background: #ff6e40; }
.food-macro-bar .macro-val { font-size: 12px; opacity: .9; min-width: 55px; text-align: right; }
.food-streak-badge { margin-top: 6px; display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,.18); border-radius: 12px; padding: 4px 12px; font-size: 12px; font-weight: 600; }

/* ── Fitness card details ── */
.fit-summary-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.fit-card {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px;
  padding: 16px; text-align: center;
}
.fit-card-title { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: rgba(255,255,255,0.4); margin-bottom: 4px; }
.fit-card-val { font-size: 24px; font-weight: 800; color: #fff; }

/* ── Log Workout Form ── */
.fit-log-form {
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
  border-radius: 16px; padding: 18px; margin-bottom: 16px;
}
.fit-log-form h3 { font-size: 15px; font-weight: 700; margin: 0 0 14px; color: #fff; display: flex; align-items: center; gap: 6px; }
.fit-type-toggle { display: flex; gap: 10px; margin-bottom: 14px; }
.fit-type-btn {
  flex: 1; padding: 8px; border: 1.5px solid rgba(255,255,255,0.15); border-radius: 10px;
  background: none; color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 700; cursor: pointer; transition: all .15s;
}
.fit-type-btn.active { border-color: #6c5ce7; background: rgba(108,92,231,0.1); color: #a29bfe; }
.fit-form-group { margin-bottom: 12px; }
.fit-form-group label { display: block; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.4); margin-bottom: 4px; }
.fit-form-input, .fit-form-select {
  width: 100%; padding: 10px 12px; border: 1.5px solid rgba(255,255,255,0.1); border-radius: 10px;
  background: rgba(0,0,0,0.2); color: #fff; font-size: 14px; outline: none; transition: border-color .2s;
}
.fit-form-input:focus, .fit-form-select:focus { border-color: #6c5ce7; }
.fit-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.fit-form-submit {
  width: 100%; padding: 12px; border: none; border-radius: 10px;
  background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%);
  color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; transition: transform .1s;
}
.fit-form-submit:active { transform: scale(0.98); }

/* ── Workouts list ── */
.fit-list { display: flex; flex-direction: column; gap: 8px; }
.fit-item {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px; padding: 12px; display: flex; align-items: center; gap: 12px;
}
.fit-item-icon { font-size: 20px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.04); border-radius: 10px; }
.fit-item-info { flex: 1; }
.fit-item-name { font-size: 14px; font-weight: 700; color: #fff; }
.fit-item-meta { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 2px; }
.fit-item-cal { font-size: 14px; font-weight: 800; color: #00cec9; }

/* ── Scanner Button ───────────────────────────────────────────────────── */
.food-scan-btn {
  width: 100%; padding: 14px; border: none; border-radius: 14px; cursor: pointer;
  background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
  color: #fff; font-size: 16px; font-weight: 700; margin-bottom: 16px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  box-shadow: 0 4px 14px rgba(0,206,201,.35); transition: transform .15s, box-shadow .15s;
}
.food-scan-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,206,201,.45); }
.food-scan-btn:active { transform: scale(.97); }

/* ── Quick Search ─────────────────────────────────────────────────────── */
.food-search-wrap { position: relative; margin-bottom: 16px; }
.food-search-input {
  width: 100%; padding: 12px 16px 12px 42px; border: 2px solid rgba(255,255,255,0.08); border-radius: 14px;
  font-size: 15px; outline: none; background: rgba(255,255,255,0.05); color: #fff; transition: border-color .2s;
}
.food-search-input:focus { border-color: #667eea; }
.food-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: 18px; opacity: .5; pointer-events: none; }
.food-search-results {
  position: absolute; top: 100%; left: 0; right: 0; z-index: 100;
  background: #1e1e30; border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; box-shadow: 0 8px 30px rgba(0,0,0,.5);
  max-height: 280px; overflow-y: auto; margin-top: 4px; display: none;
}
.food-search-results.visible { display: block; }
.food-search-item {
  display: flex; align-items: center; padding: 10px 14px; cursor: pointer;
  border-bottom: 1px solid rgba(255,255,255,0.05); gap: 10px; transition: background .15s;
}
.food-search-item:last-child { border-bottom: none; }
.food-search-item:hover { background: rgba(255,255,255,0.05); }
.food-search-item .fsi-icon { font-size: 22px; flex-shrink: 0; }
.food-search-item .fsi-info { flex: 1; }
.food-search-item .fsi-name { font-weight: 600; font-size: 14px; color: #fff; }
.food-search-item .fsi-meta { font-size: 11px; color: #888; }
.food-search-item .fsi-cal { font-weight: 700; color: #a29bfe; font-size: 14px; white-space: nowrap; }

/* ── Meal Sections ────────────────────────────────────────────────────── */
.food-meal-section { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 16px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
.food-meal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.food-meal-title { font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 6px; color: #fff; }
.food-meal-cals { font-size: 13px; color: #888; font-weight: 500; }
.food-meal-add-btn {
  border: none; background: rgba(108,92,231,0.15); color: #a29bfe; font-size: 13px; font-weight: 600;
  padding: 6px 12px; border-radius: 8px; cursor: pointer; transition: background .15s;
}
.food-meal-add-btn:hover { background: rgba(108,92,231,0.25); }
.food-entry {
  display: flex; align-items: center; gap: 10px; padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.food-entry:last-child { border-bottom: none; }
.food-entry-icon { font-size: 24px; }
.food-entry-info { flex: 1; }
.food-entry-name { font-size: 14px; font-weight: 600; color: #fff; }
.food-entry-detail { font-size: 11px; color: #888; }
.food-entry-cal { font-weight: 700; font-size: 14px; color: #00cec9; margin-right: 4px; }
.food-entry-del {
  border: none; background: none; color: #ff7675; font-size: 16px; cursor: pointer; opacity: .6;
  padding: 4px; transition: opacity .15s;
}
.food-entry-del:hover { opacity: 1; }
.food-meal-empty { font-size: 13px; color: #777; text-align: center; padding: 10px 0; }

/* ── Weekly Trend ─────────────────────────────────────────────────────── */
.food-weekly { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 18px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
.food-weekly h3 { font-size: 16px; font-weight: 700; margin: 0 0 14px; color: #fff; }
.food-weekly-chart { display: flex; align-items: flex-end; gap: 8px; height: 120px; }
.food-weekly-bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
.food-weekly-bar-track { flex: 1; width: 100%; display: flex; align-items: flex-end; justify-content: center; }
.food-weekly-bar {
  width: 100%; max-width: 34px; border-radius: 6px 6px 2px 2px;
  background: linear-gradient(180deg, #6c5ce7, #a29bfe); transition: height .4s ease;
  position: relative; cursor: default;
}
.food-weekly-bar.over-goal { background: linear-gradient(180deg, #e17055, #d63031); }
.food-weekly-bar-val { font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.6); margin-bottom: 2px; }
.food-weekly-bar-day { font-size: 11px; color: #888; margin-top: 4px; font-weight: 600; }

/* ── Modal (food picker / camera) ─────────────────────────────────────── */
.food-modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.65); z-index: 1000;
  display: flex; align-items: flex-end; justify-content: center;
  backdrop-filter: blur(8px);
  animation: food-fade-in .2s ease;
}
@keyframes food-fade-in { from { opacity: 0; } to { opacity: 1; } }
.food-modal {
  background: #151522; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px 20px 0 0; width: 100%; max-width: 600px;
  max-height: 90vh; overflow-y: auto; padding: 20px 20px 30px; color: #fff;
  animation: food-slide-up .3s ease;
}
@keyframes food-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
.food-modal-handle { width: 40px; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; margin: 0 auto 16px; }
.food-modal h3 { font-size: 18px; font-weight: 700; margin: 0 0 14px; text-align: center; color: #fff; }

/* Scanner photo preview */
.food-photo-preview { width: 100%; max-height: 200px; object-fit: cover; border-radius: 12px; margin-bottom: 14px; }

/* Serving picker in modal */
.food-serving-row { display: flex; align-items: center; justify-content: center; gap: 14px; margin: 14px 0; }
.food-serving-row button {
  width: 36px; height: 36px; border-radius: 50%; border: 2px solid #6c5ce7;
  background: none; color: #a29bfe; font-size: 18px; font-weight: 700; cursor: pointer;
}
.food-serving-row button:hover { background: #6c5ce7; color: #fff; }
.food-serving-row .serving-val { font-size: 20px; font-weight: 700; min-width: 40px; text-align: center; }
.food-meal-picker { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin: 10px 0 14px; }
.food-meal-chip {
  padding: 6px 14px; border-radius: 20px; border: 2px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7); font-size: 13px; font-weight: 600; cursor: pointer; transition: all .15s;
}
.food-meal-chip.active { border-color: #6c5ce7; background: #6c5ce7; color: #fff; }
.food-modal-confirm {
  width: 100%; padding: 14px; border: none; border-radius: 12px; background: #6c5ce7;
  color: #fff; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 8px;
}
.food-modal-confirm:hover { background: #5a6fe0; }

/* Goals editor */
.food-goals-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 14px 0; }
.food-goal-field label { display: block; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.4); margin-bottom: 4px; }
.food-goal-field input {
  width: 100%; padding: 10px; border: 2px solid rgba(255,255,255,0.1); border-radius: 10px; font-size: 15px;
  background: rgba(0,0,0,0.2); color: #fff; outline: none; transition: border-color .2s;
}
.food-goal-field input:focus { border-color: #6c5ce7; }

/* ── Utility ──────────────────────────────────────────────────────────── */
.food-section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #999; margin: 18px 0 8px; }
.food-settings-btn {
  border: none; background: none; font-size: 20px; cursor: pointer; opacity: .5; padding: 4px;
}
.food-settings-btn:hover { opacity: 1; }
`;
    document.head.appendChild(style);
  }

  /* ── Modal Utilities ────────────────────────────────────────────────────── */
  let _activeModal = null;
  function openModal(html) {
    closeModal();
    const overlay = document.createElement('div');
    overlay.className = 'food-modal-overlay';
    overlay.innerHTML = `<div class="food-modal"><div class="food-modal-handle"></div>${html}</div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.body.appendChild(overlay);
    _activeModal = overlay;
    return overlay;
  }
  function closeModal() {
    if (_activeModal) { _activeModal.remove(); _activeModal = null; }
  }

  /* ── Camera Scanner ─────────────────────────────────────────────────────── */
  const scanner = {
    openCamera(renderCb) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.style.display = 'none';
      document.body.appendChild(input);

      input.addEventListener('change', () => {
        const file = input.files[0];
        if (!file) { input.remove(); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
          input.remove();
          scanner._showPhotoModal(e.target.result, renderCb);
        };
        reader.readAsDataURL(file);
      });
      input.click();
    },

    _showPhotoModal(dataUrl, renderCb) {
      const html = `
        <h3>📸 What did you eat?</h3>
        <img src="${dataUrl}" class="food-photo-preview" alt="Food photo" />
        <div class="food-search-wrap" style="margin-bottom:0;">
          <span class="food-search-icon">🔍</span>
          <input type="text" class="food-search-input" id="food-scan-search" placeholder="Search for the food..." autofocus />
          <div class="food-search-results" id="food-scan-results"></div>
        </div>
        <div id="food-scan-selected" style="margin-top:14px;"></div>
      `;
      const overlay = openModal(html);

      const searchInput = overlay.querySelector('#food-scan-search');
      const resultsDiv  = overlay.querySelector('#food-scan-results');
      const selectedDiv = overlay.querySelector('#food-scan-selected');

      searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim();
        const results = search(q);
        if (results.length === 0 || !q) { resultsDiv.classList.remove('visible'); return; }
        resultsDiv.innerHTML = results.slice(0, 8).map(f => `
          <div class="food-search-item" data-name="${esc(f.name)}">
            <span class="fsi-icon">${f.icon}</span>
            <div class="fsi-info"><div class="fsi-name">${esc(f.name)}</div>
            <div class="fsi-meta">${f.servingSize} ${f.servingUnit} · P:${f.protein}g C:${f.carbs}g F:${f.fat}g</div></div>
            <span class="fsi-cal">${f.calories} cal</span>
          </div>
        `).join('');
        resultsDiv.classList.add('visible');
      });

      resultsDiv.addEventListener('click', (e) => {
        const item = e.target.closest('.food-search-item');
        if (!item) return;
        const fname = item.dataset.name;
        const food = database.find(f => f.name === fname);
        if (!food) return;
        resultsDiv.classList.remove('visible');
        searchInput.value = food.name;
        scanner._showServingPicker(selectedDiv, food, renderCb);
      });
    },

    _showServingPicker(container, food, renderCb) {
      let servings = 1;
      let selectedMeal = 'Lunch';
      const renderPicker = () => {
        container.innerHTML = `
          <div style="text-align:center;margin-bottom:10px;">
            <span style="font-size:36px;">${food.icon}</span>
            <div style="font-weight:700;font-size:16px;margin-top:4px;">${esc(food.name)}</div>
            <div style="font-size:13px;color:#888;">${food.servingSize} ${food.servingUnit} per serving · ${food.calories} cal</div>
          </div>
          <div class="food-serving-row">
            <button id="food-sv-minus">−</button>
            <div class="serving-val" id="food-sv-val">${servings}</div>
            <button id="food-sv-plus">+</button>
          </div>
          <div style="text-align:center;font-size:22px;font-weight:800;color:#667eea;margin-bottom:10px;">
            ${Math.round(food.calories * servings)} cal
          </div>
          <div class="food-meal-picker">
            ${MEALS.map(m => `<div class="food-meal-chip${m === selectedMeal ? ' active' : ''}" data-meal="${m}">${MEAL_ICONS[m]} ${m}</div>`).join('')}
          </div>
          <button class="food-modal-confirm" id="food-confirm-log">Log Food</button>
        `;
        container.querySelector('#food-sv-minus').onclick = () => { servings = Math.max(0.5, servings - 0.5); renderPicker(); };
        container.querySelector('#food-sv-plus').onclick  = () => { servings += 0.5; renderPicker(); };
        container.querySelectorAll('.food-meal-chip').forEach(chip => {
          chip.onclick = () => { selectedMeal = chip.dataset.meal; renderPicker(); };
        });
        container.querySelector('#food-confirm-log').onclick = () => {
          log.add({ foodName: food.name, meal: selectedMeal, servingCount: servings });
          closeModal();
          if (typeof App !== 'undefined' && App.toast) App.toast(`${food.icon} ${food.name} logged!`);
          if (renderCb) renderCb();
        };
      };
      renderPicker();
    },
  };

  /* ── SVG Calorie Ring Generator ─────────────────────────────────────────── */
  function calorieRingSVG(consumed, burned, goal) {
    const net = consumed - burned;
    const pct = Math.min(Math.max(0, net) / goal, 1);
    const r = 54, c = 2 * Math.PI * r;
    const strokeOff = c - (c * pct);
    const color = pct >= 1 ? '#ff6e40' : '#00e5ff';
    return `
      <svg width="130" height="130" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="${r}" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="10"/>
        <circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-width="10"
          stroke-dasharray="${c}" stroke-dashoffset="${strokeOff}" stroke-linecap="round"
          style="transition:stroke-dashoffset .6s ease"/>
      </svg>
    `;
  }

  /* ── Standalone Add-Food Modal ──────────────────────────────────────────── */
  function showAddFoodModal(food, meal, renderCb) {
    const html = `
      <h3>Add Food</h3>
      <div id="food-standalone-picker"></div>
    `;
    const overlay = openModal(html);
    const pickerDiv = overlay.querySelector('#food-standalone-picker');
    scanner._showServingPicker(pickerDiv, food, renderCb);
  }

  /* ── Active Workout Timer Helpers ── */
  function _startWorkoutTimerInterval(container) {
    if (_workoutInterval) clearInterval(_workoutInterval);
    _workoutInterval = setInterval(() => {
      _updateTimerUI(container);
    }, 1000);
  }

  function _updateTimerUI(container) {
    const display = container.querySelector('#fit-timer-display');
    if (!display) return;
    
    let elapsedMs = _workoutAccumulatedTime;
    if (_workoutTimerState === 'running') {
      elapsedMs += Date.now() - _workoutStartTime;
    }
    
    const elapsedSecs = Math.floor(elapsedMs / 1000);
    const m = String(Math.floor(elapsedSecs / 60)).padStart(2, '0');
    const s = String(elapsedSecs % 60).padStart(2, '0');
    display.textContent = `${m}:${s}`;
    
    // Update estimated calories
    const mins = elapsedSecs / 60;
    let coef = 8; // Cardio
    if (_selectedWorkoutTimerType === 'Strength') coef = 6;
    else if (_selectedWorkoutTimerType === 'Yoga') coef = 4;
    else if (_selectedWorkoutTimerType === 'Custom') coef = 5;
    
    const estCal = Math.round(mins * coef);
    const typeLabel = container.querySelector('#fit-timer-type-label');
    if (typeLabel) {
      typeLabel.textContent = `Type: ${_selectedWorkoutTimerType} (estimated: ${estCal} cal)`;
    }
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  function render(container) {
    injectCSS();
    seedIfNeeded();

    const summary = analytics.getTodaySummary();
    const trend = analytics.getWeeklyTrend();
    const streak = analytics.getStreak();
    const g = goals.get();
    const burnedToday = workouts.getTodayBurned();
    const weeklyWorkouts = workouts.getWeeklyTrend();

    const refreshAll = () => render(container);
    performSync(refreshAll);

    /* ── Build HTML ──────────────────────────────────── */
    let html = `<div class="food-tracker">`;

    /* Tabs Header */
    html += `
      <div class="food-tabs">
        <button class="food-tab-btn ${_activeTab === 'nutrition' ? 'active' : ''}" id="btn-tab-nutrition">🍎 Nutrition</button>
        <button class="food-tab-btn ${_activeTab === 'fitness' ? 'active' : ''}" id="btn-tab-fitness">🏋️ Fitness</button>
      </div>
    `;

    if (_activeTab === 'nutrition') {
      /* ──────────────── NUTRITION VIEW ──────────────── */
      
      /* Summary Card showing Net Calories */
      html += `
        <div class="food-summary-card">
          <div class="food-calorie-ring">
            ${calorieRingSVG(summary.totalCalories, burnedToday, g.calories)}
            <div class="ring-label">
              <span class="cal-num">${Math.max(0, summary.totalCalories - burnedToday)}</span>
              <span class="cal-sub">Net Cal</span>
              <span class="cal-sub" style="font-size:9px;opacity:0.7;">Goal: ${g.calories}</span>
            </div>
          </div>
          <div class="food-macros">
            <div class="food-macro-bar">
              <span class="macro-label">Protein</span>
              <div class="macro-track"><div class="macro-fill protein" style="width:${Math.min(100, summary.protein / g.protein * 100)}%"></div></div>
              <span class="macro-val">${Math.round(summary.protein)}/${g.protein}g</span>
            </div>
            <div class="food-macro-bar">
              <span class="macro-label">Carbs</span>
              <div class="macro-track"><div class="macro-fill carbs" style="width:${Math.min(100, summary.carbs / g.carbs * 100)}%"></div></div>
              <span class="macro-val">${Math.round(summary.carbs)}/${g.carbs}g</span>
            </div>
            <div class="food-macro-bar">
              <span class="macro-label">Fat</span>
              <div class="macro-track"><div class="macro-fill fat" style="width:${Math.min(100, summary.fat / g.fat * 100)}%"></div></div>
              <span class="macro-val">${Math.round(summary.fat)}/${g.fat}g</span>
            </div>
            <div class="food-streak-badge">🔥 ${streak} day streak</div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:2px;">
              <span style="font-size:11px;opacity:0.75;">C: ${summary.totalCalories} · B: ${burnedToday}</span>
              <button class="food-settings-btn" id="food-goals-btn" title="Edit Goals">⚙️</button>
            </div>
          </div>
        </div>
      `;

      /* Scan Button */
      html += `<button class="food-scan-btn" id="food-scan-trigger" style="display:flex;align-items:center;justify-content:center;gap:8px;">📸 Scan Food <span style=\"font-size:0.7rem;background:rgba(108,92,231,0.3);padding:2px 8px;border-radius:10px;font-weight:600;\">AI</span></button>`;

      /* Quick Search */
      html += `
        <div class="food-search-wrap">
          <span class="food-search-icon">🔍</span>
          <input type="text" class="food-search-input" id="food-quick-search" placeholder="Quick add — search foods..." autocomplete="off" />
          <div class="food-search-results" id="food-quick-results"></div>
        </div>
      `;

      /* Meal Sections */
      MEALS.forEach(meal => {
        const mealInfo = summary.meals[meal];
        const items = mealInfo ? mealInfo.items : [];
        html += `
          <div class="food-meal-section">
            <div class="food-meal-header">
              <div>
                <span class="food-meal-title">${MEAL_ICONS[meal]} ${meal}</span>
                <span class="food-meal-cals">${mealInfo ? Math.round(mealInfo.calories) : 0} cal</span>
              </div>
              <button class="food-meal-add-btn" data-meal="${meal}">+ Add</button>
            </div>
        `;
        if (items.length === 0) {
          html += `<div class="food-meal-empty">No food logged yet</div>`;
        } else {
          items.forEach(e => {
            html += `
              <div class="food-entry">
                <span class="food-entry-icon">${e.icon}</span>
                <div class="food-entry-info">
                  <div class="food-entry-name">${esc(e.foodName)}</div>
                  <div class="food-entry-detail">${e.servingCount}× ${e.servingSize} ${e.servingUnit} · P:${e.protein}g C:${e.carbs}g F:${e.fat}g</div>
                </div>
                <span class="food-entry-cal">${e.calories}</span>
                <button class="food-entry-del" data-id="${e.id}" title="Remove">✕</button>
              </div>
            `;
          });
        }
        html += `</div>`;
      });

      /* Weekly Trend */
      html += `
        <div class="food-weekly">
          <h3>📊 Weekly Calories Consumed</h3>
          <div class="food-weekly-chart">
      `;
      trend.forEach(d => {
        const pct = Math.max(...trend.map(x => x.calories), g.calories) > 0 ? (d.calories / Math.max(...trend.map(x => x.calories), g.calories) * 100) : 0;
        const isOver = d.calories > g.calories;
        html += `
          <div class="food-weekly-bar-wrap">
            <div class="food-weekly-bar-val">${d.calories > 0 ? d.calories : ''}</div>
            <div class="food-weekly-bar-track">
              <div class="food-weekly-bar${isOver ? ' over-goal' : ''}" style="height:${Math.max(pct, 3)}%"></div>
            </div>
            <div class="food-weekly-bar-day">${d.dayLabel}</div>
          </div>
        `;
      });
      html += `</div></div>`;

    } else {
      /* ──────────────── FITNESS VIEW ──────────────── */

      /* Fitness Summary Cards */
      html += `
        <div class="fit-summary-row">
          <div class="fit-card">
            <div class="fit-card-title">Calories Burned Today</div>
            <div class="fit-card-val" style="color:#00cec9;">🔥 ${burnedToday} kcal</div>
          </div>
          <div class="fit-card">
            <div class="fit-card-title">Active Workouts</div>
            <div class="fit-card-val" style="color:#a29bfe;">🏋️ ${workouts.getToday().length} sessions</div>
          </div>
        </div>
      `;

      /* Active Workout Timer Stopwatch */
      html += `
        <div class="fit-card fit-timer-card" style="margin-bottom:16px;text-align:left;position:relative;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);">
          <div class="fit-card-title">⏱️ Active Workout Timer</div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;">
            <div>
              <div class="fit-timer-display" id="fit-timer-display" style="font-size:36px;font-weight:700;font-family:monospace;color:#00cec9;">00:00</div>
              <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;" id="fit-timer-type-label">Type: Cardio (estimated: 0 cal)</div>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="well-water-btn" id="btn-fit-timer-toggle" style="background:#00cec9;color:#0a0a0f;border:none;min-width:75px;height:32px;border-radius:16px;font-size:12px;font-weight:700;cursor:pointer;">${_workoutTimerState === 'running' ? '⏸️ Pause' : _workoutTimerState === 'paused' ? '▶ Resume' : '▶ Start'}</button>
              <button class="well-water-btn" id="btn-fit-timer-stop" style="background:#ff4757;color:#fff;border:none;min-width:75px;height:32px;border-radius:16px;font-size:12px;font-weight:700;cursor:pointer;display:${_workoutTimerState !== 'idle' ? 'block' : 'none'};">⏹️ Stop</button>
            </div>
          </div>
          <div class="fit-timer-type-selector" id="fit-timer-type-selector" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;">
            <span class="well-prompt-chip ${_selectedWorkoutTimerType === 'Cardio' ? 'active' : ''}" data-type="Cardio" style="${_selectedWorkoutTimerType === 'Cardio' ? 'background:rgba(0,206,201,0.2);border-color:#00cec9;color:#fff;' : ''}">🏃 Cardio</span>
            <span class="well-prompt-chip ${_selectedWorkoutTimerType === 'Strength' ? 'active' : ''}" data-type="Strength" style="${_selectedWorkoutTimerType === 'Strength' ? 'background:rgba(162,155,254,0.2);border-color:#a29bfe;color:#fff;' : ''}">🏋️ Strength</span>
            <span class="well-prompt-chip ${_selectedWorkoutTimerType === 'Yoga' ? 'active' : ''}" data-type="Yoga" style="${_selectedWorkoutTimerType === 'Yoga' ? 'background:rgba(0,184,148,0.2);border-color:#00b894;color:#fff;' : ''}">🧘 Yoga</span>
            <span class="well-prompt-chip ${_selectedWorkoutTimerType === 'Custom' ? 'active' : ''}" data-type="Custom" style="${_selectedWorkoutTimerType === 'Custom' ? 'background:rgba(253,121,168,0.2);border-color:#fd79a8;color:#fff;' : ''}">💪 Custom</span>
          </div>
        </div>
      `;

      /* Quick Routines */
      html += `
        <div class="fit-card" style="margin-bottom:16px;text-align:left;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);">
          <div class="fit-card-title">⚡ Quick Start Routines</div>
          <div class="fit-routines-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;">
            <div class="fit-routine-item" data-name="Morning Flow" data-type="strength" data-dur="15" data-cal="60" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);border-radius:10px;padding:10px;cursor:pointer;">
              <div style="font-weight:700;font-size:13px;color:#fff;">🧘 Morning Flow</div>
              <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">15 min Yoga · 60 cal</div>
            </div>
            <div class="fit-routine-item" data-name="HIIT Burner" data-type="cardio" data-dur="20" data-cal="180" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);border-radius:10px;padding:10px;cursor:pointer;">
              <div style="font-weight:700;font-size:13px;color:#fff;">⚡ HIIT Burner</div>
              <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">20 min Cardio · 180 cal</div>
            </div>
            <div class="fit-routine-item" data-name="Core Crusher" data-type="strength" data-dur="10" data-cal="80" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);border-radius:10px;padding:10px;cursor:pointer;">
              <div style="font-weight:700;font-size:13px;color:#fff;">🏋️ Core Crusher</div>
              <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">10 min Strength · 80 cal</div>
            </div>
            <div class="fit-routine-item" data-name="Power Walk" data-type="cardio" data-dur="30" data-cal="150" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);border-radius:10px;padding:10px;cursor:pointer;">
              <div style="font-weight:700;font-size:13px;color:#fff;">🚶 Power Walk</div>
              <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">30 min Cardio · 150 cal</div>
            </div>
          </div>
        </div>
      `;

      /* Log Workout Inline Form */
      html += `
        <div class="fit-log-form">
          <h3>➕ Log Workout</h3>
          
          <div class="fit-type-toggle">
            <button class="fit-type-btn active" id="btn-type-cardio" data-type="cardio">🏃 Cardio</button>
            <button class="fit-type-btn" id="btn-type-strength" data-type="strength">🏋️ Strength</button>
          </div>
          
          <div class="fit-form-group">
            <label>Exercise Name</label>
            <select class="fit-form-select" id="fit-name-select">
              <option value="Running">🏃 Running</option>
              <option value="Cycling">🚴 Cycling</option>
              <option value="Swimming">🏊 Swimming</option>
              <option value="Walking">🚶 Walking</option>
              <option value="HIIT">⚡ HIIT</option>
            </select>
          </div>

          <div class="fit-form-row">
            <div class="fit-form-group">
              <label id="lbl-dur-dist">Duration (mins)</label>
              <input type="number" class="fit-form-input" id="fit-dur-input" placeholder="30" min="1" />
            </div>
            <div class="fit-form-group" id="group-distance-or-weight">
              <label id="lbl-dist-weight">Distance (miles)</label>
              <input type="number" class="fit-form-input" id="fit-dist-weight-input" placeholder="3.1" step="0.1" min="0" />
            </div>
          </div>

          <div class="fit-form-row" id="fit-strength-only-row" style="display:none;margin-bottom:12px;">
            <div class="fit-form-group">
              <label>Sets</label>
              <input type="number" class="fit-form-input" id="fit-sets-input" placeholder="3" min="1" />
            </div>
            <div class="fit-form-group">
              <label>Reps per Set</label>
              <input type="number" class="fit-form-input" id="fit-reps-input" placeholder="10" min="1" />
            </div>
          </div>

          <div class="fit-form-group" id="fit-custom-cals-group">
            <label>Custom Calories Burned (optional, leaves to MET auto-calc)</label>
            <input type="number" class="fit-form-input" id="fit-cals-input" placeholder="e.g. 300" min="0" />
          </div>

          <button class="fit-form-submit" id="fit-submit-btn">Log Workout</button>
        </div>
      `;

      /* Today's Workouts History */
      html += `
        <div class="food-meal-section">
          <div class="food-meal-header">
            <span class="food-meal-title">📋 Today's Workouts</span>
            <span class="food-meal-cals">${burnedToday} cal total</span>
          </div>
      `;
      const todayWorkouts = workouts.getToday();
      if (todayWorkouts.length === 0) {
        html += `<div class="food-meal-empty">No workouts logged today</div>`;
      } else {
        todayWorkouts.forEach(w => {
          let detailsText = `${w.durationMinutes} mins`;
          if (w.type === 'cardio' && w.distance) {
            detailsText += ` · ${w.distance} miles`;
          } else if (w.type === 'strength') {
            if (w.sets && w.reps) {
              detailsText += ` · ${w.sets} sets × ${w.reps} reps`;
            }
            if (w.weight) {
              detailsText += ` @ ${w.weight} lbs`;
            }
          }
          html += `
            <div class="food-entry">
              <span class="food-entry-icon">${w.icon || '💪'}</span>
              <div class="food-entry-info">
                <div class="food-entry-name">${esc(w.exerciseName)}</div>
                <div class="food-entry-detail">${detailsText}</div>
              </div>
              <span class="fit-item-cal">-${w.calories} cal</span>
              <button class="food-entry-del fit-workout-del" data-id="${w.id}" title="Remove">✕</button>
            </div>
          `;
        });
      }
      html += `</div>`;

      /* Weekly Active Calories Burned Chart */
      const maxWeeklyBurn = Math.max(...weeklyWorkouts.map(w => w.calories), 100);
      html += `
        <div class="food-weekly">
          <h3>📊 Weekly Calories Burned</h3>
          <div class="food-weekly-chart">
      `;
      weeklyWorkouts.forEach(w => {
        const pct = (w.calories / maxWeeklyBurn) * 100;
        html += `
          <div class="food-weekly-bar-wrap">
            <div class="food-weekly-bar-val">${w.calories > 0 ? w.calories : ''}</div>
            <div class="food-weekly-bar-track">
              <div class="food-weekly-bar" style="height:${Math.max(pct, 3)}%;background:linear-gradient(180deg, #00cec9, #0984e3);"></div>
            </div>
            <div class="food-weekly-bar-day">${w.dayLabel}</div>
          </div>
        `;
      });
      html += `</div></div>`;
    }

    html += `</div>`; // .food-tracker
    container.innerHTML = html;

    /* ── Event Binding ──────────────────────────────── */

    // Tab Switchers
    container.querySelector('#btn-tab-nutrition').addEventListener('click', () => { _activeTab = 'nutrition'; refreshAll(); });
    container.querySelector('#btn-tab-fitness').addEventListener('click', () => { _activeTab = 'fitness'; refreshAll(); });

    if (_activeTab === 'nutrition') {
      /* Scan button — AI-powered food scanner */
      container.querySelector('#food-scan-trigger').addEventListener('click', () => scanFood(refreshAll));

      /* Goals button */
      container.querySelector('#food-goals-btn').addEventListener('click', () => {
        const g = goals.get();
        const mHtml = `
          <h3>🎯 Daily Goals</h3>
          <div class="food-goals-grid">
            <div class="food-goal-field"><label>Calories</label><input type="number" id="fg-cal" value="${g.calories}" /></div>
            <div class="food-goal-field"><label>Protein (g)</label><input type="number" id="fg-pro" value="${g.protein}" /></div>
            <div class="food-goal-field"><label>Carbs (g)</label><input type="number" id="fg-carb" value="${g.carbs}" /></div>
            <div class="food-goal-field"><label>Fat (g)</label><input type="number" id="fg-fat" value="${g.fat}" /></div>
          </div>

          <div style="margin-top:14px;border-top:1px solid rgba(255,255,255,0.08);padding-top:12px;">
            <p style="font-size:12px;font-weight:700;color:#a29bfe;margin:0 0 8px;cursor:pointer;user-select:none;" id="toggle-tdee-calc">🧮 Use TDEE Calorie Calculator (+)</p>
            <div id="tdee-calc-form" style="display:none;flex-direction:column;gap:8px;">
              <div class="food-goals-grid" style="grid-template-columns:1fr 1fr;gap:8px;">
                <div class="food-goal-field"><label>Weight (lbs)</label><input type="number" id="tdee-weight" value="160" /></div>
                <div class="food-goal-field"><label>Height (inches)</label><input type="number" id="tdee-height" value="68" /></div>
                <div class="food-goal-field"><label>Age</label><input type="number" id="tdee-age" value="28" /></div>
                <div class="food-goal-field">
                  <label>Activity Level</label>
                  <select id="tdee-activity" style="background:#0a0a0f;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:4px;padding:4px;font-size:11px;width:100%;height:32px;">
                    <option value="1.2">Sedentary (desk job)</option>
                    <option value="1.375">Lightly Active (1-3 days/wk)</option>
                    <option value="1.55" selected>Moderately Active (3-5 days/wk)</option>
                    <option value="1.725">Very Active (6-7 days/wk)</option>
                  </select>
                </div>
              </div>
              <button class="well-water-btn" id="btn-tdee-compute" style="width:100%;padding:8px;font-size:12px;margin-top:6px;">Calculate & Apply</button>
            </div>
          </div>

          <button class="food-modal-confirm" id="fg-save" style="margin-top:16px;">Save Goals</button>
        `;
        const overlay = openModal(mHtml);

        const toggle = overlay.querySelector('#toggle-tdee-calc');
        const form = overlay.querySelector('#tdee-calc-form');
        toggle.addEventListener('click', () => {
          const show = form.style.display === 'none';
          form.style.display = show ? 'flex' : 'none';
          toggle.textContent = show ? '🧮 Use TDEE Calorie Calculator (-)' : '🧮 Use TDEE Calorie Calculator (+)';
        });

        overlay.querySelector('#btn-tdee-compute').addEventListener('click', () => {
          const w = parseFloat(overlay.querySelector('#tdee-weight').value) || 160;
          const h = parseFloat(overlay.querySelector('#tdee-height').value) || 68;
          const age = parseInt(overlay.querySelector('#tdee-age').value) || 28;
          const act = parseFloat(overlay.querySelector('#tdee-activity').value) || 1.55;

          const wKg = w * 0.45359237;
          const hCm = h * 2.54;
          const bmr = (10 * wKg) + (6.25 * hCm) - (5 * age) + 5;
          const tdee = Math.round(bmr * act);

          overlay.querySelector('#fg-cal').value = tdee;
          overlay.querySelector('#fg-pro').value = Math.round((tdee * 0.3) / 4);
          overlay.querySelector('#fg-carb').value = Math.round((tdee * 0.4) / 4);
          overlay.querySelector('#fg-fat').value = Math.round((tdee * 0.3) / 9);

          if (typeof App !== 'undefined' && App.toast) App.toast('Calculated TDEE & macros applied!', 'success');
        });

        overlay.querySelector('#fg-save').addEventListener('click', () => {
          goals.set({
            calories: parseInt(overlay.querySelector('#fg-cal').value) || 2000,
            protein:  parseInt(overlay.querySelector('#fg-pro').value) || 150,
            carbs:    parseInt(overlay.querySelector('#fg-carb').value) || 250,
            fat:      parseInt(overlay.querySelector('#fg-fat').value) || 65,
          });
          closeModal();
          refreshAll();
        });
      });

      /* Quick search */
      const qSearch = container.querySelector('#food-quick-search');
      const qResults = container.querySelector('#food-quick-results');
      qSearch.addEventListener('input', () => {
        const q = qSearch.value.trim();
        const results = search(q);
        if (!q || results.length === 0) { qResults.classList.remove('visible'); return; }
        qResults.innerHTML = results.slice(0, 8).map(f => `
          <div class="food-search-item" data-name="${esc(f.name)}">
            <span class="fsi-icon">${f.icon}</span>
            <div class="fsi-info"><div class="fsi-name">${esc(f.name)}</div>
            <div class="fsi-meta">${f.servingSize} ${f.servingUnit} · ${f.calories} cal</div></div>
            <span class="fsi-cal">${f.calories} cal</span>
          </div>
        `).join('');
        qResults.classList.add('visible');
      });

      qSearch.addEventListener('blur', () => { setTimeout(() => qResults.classList.remove('visible'), 200); });

      qResults.addEventListener('click', (e) => {
        const item = e.target.closest('.food-search-item');
        if (!item) return;
        const food = database.find(f => f.name === item.dataset.name);
        if (!food) return;
        qResults.classList.remove('visible');
        qSearch.value = '';
        showAddFoodModal(food, 'Snacks', refreshAll);
      });

      /* Meal add buttons */
      container.querySelectorAll('.food-meal-add-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const meal = btn.dataset.meal;
          const mHtml = `
            <h3>${MEAL_ICONS[meal]} Add to ${meal}</h3>
            <div class="food-search-wrap" style="margin-bottom:0;">
              <span class="food-search-icon">🔍</span>
              <input type="text" class="food-search-input" id="food-add-search" placeholder="Search foods..." autofocus />
              <div class="food-search-results" id="food-add-results"></div>
            </div>
            <div id="food-add-selected" style="margin-top:14px;"></div>
          `;
          const overlay = openModal(mHtml);
          const si = overlay.querySelector('#food-add-search');
          const sr = overlay.querySelector('#food-add-results');
          const sd = overlay.querySelector('#food-add-selected');

          si.addEventListener('input', () => {
            const q = si.value.trim();
            const results = search(q);
            if (!q || results.length === 0) { sr.classList.remove('visible'); return; }
            sr.innerHTML = results.slice(0, 8).map(f => `
              <div class="food-search-item" data-name="${esc(f.name)}">
                <span class="fsi-icon">${f.icon}</span>
                <div class="fsi-info"><div class="fsi-name">${esc(f.name)}</div>
                <div class="fsi-meta">${f.servingSize} ${f.servingUnit} · ${f.calories} cal</div></div>
                <span class="fsi-cal">${f.calories} cal</span>
              </div>
            `).join('');
            sr.classList.add('visible');
          });
          sr.addEventListener('click', (e) => {
            const item = e.target.closest('.food-search-item');
            if (!item) return;
            const food = database.find(f => f.name === item.dataset.name);
            if (!food) return;
            sr.classList.remove('visible');
            si.value = food.name;
            scanner._showServingPicker(sd, food, () => { refreshAll(); });
            /* Override meal in the confirm */
            setTimeout(() => {
              const chips = sd.querySelectorAll('.food-meal-chip');
              chips.forEach(c => {
                c.classList.toggle('active', c.dataset.meal === meal);
              });
            }, 0);
          });
        });
      });

      /* Delete food buttons */
      container.querySelectorAll('.food-entry-del:not(.fit-workout-del)').forEach(btn => {
        btn.addEventListener('click', () => {
          log.remove(btn.dataset.id);
          refreshAll();
        });
      });

    } else {
      /* Fitness Tab Event Bindings */

      // Initialize active timer UI and interval if it's already running
      _updateTimerUI(container);
      if (_workoutTimerState === 'running') {
        _startWorkoutTimerInterval(container);
      }

      // Active Workout Timer controls
      const btnToggle = container.querySelector('#btn-fit-timer-toggle');
      const btnStop = container.querySelector('#btn-fit-timer-stop');
      const display = container.querySelector('#fit-timer-display');
      
      if (btnToggle) {
        btnToggle.addEventListener('click', () => {
          if (_workoutTimerState === 'idle') {
            _workoutTimerState = 'running';
            _workoutStartTime = Date.now();
            _workoutAccumulatedTime = 0;
            _startWorkoutTimerInterval(container);
            btnToggle.textContent = '⏸️ Pause';
            if (btnStop) btnStop.style.display = 'block';
          } else if (_workoutTimerState === 'running') {
            _workoutTimerState = 'paused';
            _workoutAccumulatedTime += Date.now() - _workoutStartTime;
            if (_workoutInterval) {
              clearInterval(_workoutInterval);
              _workoutInterval = null;
            }
            btnToggle.textContent = '▶ Resume';
          } else if (_workoutTimerState === 'paused') {
            _workoutTimerState = 'running';
            _workoutStartTime = Date.now();
            _startWorkoutTimerInterval(container);
            btnToggle.textContent = '⏸️ Pause';
          }
          _updateTimerUI(container);
        });
      }

      if (btnStop) {
        btnStop.addEventListener('click', () => {
          let elapsedMs = _workoutAccumulatedTime;
          if (_workoutTimerState === 'running') {
            elapsedMs += Date.now() - _workoutStartTime;
          }
          
          _workoutTimerState = 'idle';
          if (_workoutInterval) {
            clearInterval(_workoutInterval);
            _workoutInterval = null;
          }
          
          const elapsedSecs = Math.floor(elapsedMs / 1000);
          const mins = Math.max(Math.round(elapsedSecs / 60), 1);
          let coef = 8; // Cardio
          if (_selectedWorkoutTimerType === 'Strength') coef = 6;
          else if (_selectedWorkoutTimerType === 'Yoga') coef = 4;
          else if (_selectedWorkoutTimerType === 'Custom') coef = 5;
          const estCal = Math.round((elapsedSecs / 60) * coef);
          
          _workoutAccumulatedTime = 0;
          _workoutStartTime = null;
          
          // Reset UI elements immediately
          btnToggle.textContent = '▶ Start';
          btnStop.style.display = 'none';
          if (display) display.textContent = '00:00';
          _updateTimerUI(container);
          
          // Show workout completion modal
          const logHtml = `
            <h3>🎉 Workout Completed!</h3>
            <p style="margin:10px 0;font-size:14px;color:rgba(255,255,255,0.7);">
              Great job! You worked out for <strong>${mins} min</strong> and burned an estimated <strong>${estCal} calories</strong>.
            </p>
            <div class="food-goals-grid" style="grid-template-columns: 1fr; gap:10px; margin-top:14px;">
              <div class="food-goal-field">
                <label>Exercise Name</label>
                <input type="text" id="fit-modal-name" value="${_selectedWorkoutTimerType} Session" style="width:100%;" />
              </div>
              <div class="food-goal-field" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div>
                  <label>Duration (mins)</label>
                  <input type="number" id="fit-modal-dur" value="${mins}" style="width:100%;" />
                </div>
                <div>
                  <label>Calories Burned</label>
                  <input type="number" id="fit-modal-cal" value="${estCal}" style="width:100%;" />
                </div>
              </div>
            </div>
            <button class="food-modal-confirm" id="fit-modal-save" style="margin-top:16px;width:100%;">Log Workout</button>
          `;
          const overlay = openModal(logHtml);
          overlay.querySelector('#fit-modal-save').addEventListener('click', () => {
            const finalName = overlay.querySelector('#fit-modal-name').value.trim() || `${_selectedWorkoutTimerType} Session`;
            const finalDur = parseInt(overlay.querySelector('#fit-modal-dur').value) || mins;
            const finalCal = parseInt(overlay.querySelector('#fit-modal-cal').value) || estCal;
            
            workouts.add({
              exerciseName: finalName,
              type: _selectedWorkoutTimerType.toLowerCase() === 'strength' ? 'strength' : 'cardio',
              durationMinutes: finalDur,
              calories: finalCal
            });
            
            closeModal();
            if (typeof App !== 'undefined' && App.toast) App.toast('💪 Workout logged successfully!', 'success');
            refreshAll();
          });
        });
      }

      // Workout timer type selector chips
      const timerChips = container.querySelectorAll('#fit-timer-type-selector .well-prompt-chip');
      timerChips.forEach(chip => {
        chip.addEventListener('click', () => {
          const type = chip.dataset.type;
          _selectedWorkoutTimerType = type;
          
          timerChips.forEach(c => {
            c.classList.toggle('active', c.dataset.type === type);
            if (c.dataset.type === type) {
              let bg = 'rgba(0,206,201,0.2)';
              let border = '#00cec9';
              if (type === 'Strength') { bg = 'rgba(162,155,254,0.2)'; border = '#a29bfe'; }
              else if (type === 'Yoga') { bg = 'rgba(0,184,148,0.2)'; border = '#00b894'; }
              else if (type === 'Custom') { bg = 'rgba(253,121,168,0.2)'; border = '#fd79a8'; }
              c.style.cssText = `background:${bg};border-color:${border};color:#fff;`;
            } else {
              c.style.cssText = '';
            }
          });
          
          _updateTimerUI(container);
        });
      });

      // Quick start routines
      container.querySelectorAll('.fit-routine-item').forEach(item => {
        item.addEventListener('click', () => {
          const name = item.dataset.name;
          const type = item.dataset.type;
          const dur = parseInt(item.dataset.dur) || 0;
          const cal = parseInt(item.dataset.cal) || 0;
          workouts.add({
            exerciseName: name,
            type: type,
            durationMinutes: dur,
            calories: cal
          });
          if (typeof App !== 'undefined' && App.toast) {
            App.toast(`⚡ Logged routine: ${name}!`, 'success');
          }
          refreshAll();
        });
      });

      const typeCardioBtn = container.querySelector('#btn-type-cardio');
      const typeStrengthBtn = container.querySelector('#btn-type-strength');
      const nameSelect = container.querySelector('#fit-name-select');
      const lblDurDist = container.querySelector('#lbl-dur-dist');
      const lblDistWeight = container.querySelector('#lbl-dist-weight');
      const inputDistWeight = container.querySelector('#fit-dist-weight-input');
      const strengthRow = container.querySelector('#fit-strength-only-row');
      const distWeightGroup = container.querySelector('#group-distance-or-weight');
      
      let selectedType = 'cardio';

      typeCardioBtn.addEventListener('click', () => {
        selectedType = 'cardio';
        typeCardioBtn.classList.add('active');
        typeStrengthBtn.classList.remove('active');
        strengthRow.style.display = 'none';
        distWeightGroup.style.display = '';
        lblDurDist.textContent = 'Duration (mins)';
        lblDistWeight.textContent = 'Distance (miles)';
        inputDistWeight.placeholder = '3.1';
        
        nameSelect.innerHTML = `
          <option value="Running">🏃 Running</option>
          <option value="Cycling">🚴 Cycling</option>
          <option value="Swimming">🏊 Swimming</option>
          <option value="Walking">🚶 Walking</option>
          <option value="HIIT">⚡ HIIT</option>
        `;
      });

      typeStrengthBtn.addEventListener('click', () => {
        selectedType = 'strength';
        typeStrengthBtn.classList.add('active');
        typeCardioBtn.classList.remove('active');
        strengthRow.style.display = 'grid';
        distWeightGroup.style.display = '';
        lblDurDist.textContent = 'Duration (mins)';
        lblDistWeight.textContent = 'Weight (lbs)';
        inputDistWeight.placeholder = '135';
        
        nameSelect.innerHTML = `
          <option value="Weightlifting">🏋️ Weightlifting</option>
          <option value="Yoga">🧘 Yoga</option>
          <option value="Pilates">🧘 Pilates</option>
          <option value="Other">💪 Other Exercise</option>
        `;
      });

      // Submit workout
      container.querySelector('#fit-submit-btn').addEventListener('click', () => {
        const name = nameSelect.value;
        const duration = parseInt(container.querySelector('#fit-dur-input').value);
        const distWeightVal = parseFloat(inputDistWeight.value);
        const sets = parseInt(container.querySelector('#fit-sets-input').value);
        const reps = parseInt(container.querySelector('#fit-reps-input').value);
        const customCals = parseInt(container.querySelector('#fit-cals-input').value);

        if (!duration || duration <= 0) {
          if (typeof App !== 'undefined' && App.toast) App.toast('Please enter a valid duration', 'warning');
          return;
        }

        const workoutData = {
          exerciseName: name,
          type: selectedType,
          durationMinutes: duration,
        };

        if (selectedType === 'cardio') {
          if (distWeightVal > 0) workoutData.distance = distWeightVal;
        } else {
          if (distWeightVal > 0) workoutData.weight = distWeightVal;
          if (sets > 0) workoutData.sets = sets;
          if (reps > 0) workoutData.reps = reps;
        }

        if (customCals > 0) {
          workoutData.calories = customCals;
        }

        workouts.add(workoutData);
        if (typeof App !== 'undefined' && App.toast) App.toast('💪 Workout logged successfully!', 'success');
        refreshAll();
      });

      // Delete workout buttons
      container.querySelectorAll('.fit-workout-del').forEach(btn => {
        btn.addEventListener('click', () => {
          workouts.remove(btn.dataset.id);
          refreshAll();
        });
      });
    }
  }

  /* ── AI Food Photo Scanner ──────────────────────────────────────────────── */
  let _scannedFoods = null;

  function _guessMealFromTime() {
    const h = new Date().getHours();
    if (h < 11) return 'Breakfast';
    if (h < 15) return 'Lunch';
    if (h < 20) return 'Dinner';
    return 'Snacks';
  }

  function scanFood(refreshCb) {
    // Show scanning overlay
    const overlay = document.createElement('div');
    overlay.id = 'food-scan-overlay';
    overlay.innerHTML = `
      <div class="food-scan-modal">
        <div class="food-scan-header">
          <h3>📸 Food Scanner</h3>
          <button onclick="document.getElementById('food-scan-overlay').remove()" class="btn-close">✕</button>
        </div>
        <div class="food-scan-body">
          <div id="scan-preview" class="scan-preview">
            <div class="scan-placeholder">
              <span style="font-size: 3rem;">📷</span>
              <p>Take a photo of your food or select from gallery</p>
            </div>
          </div>
          <div id="scan-results" style="display:none;"></div>
          <div class="scan-actions">
            <button id="btn-scan-capture" class="btn btn-primary" style="width:100%; padding: 0.875rem; border-radius: var(--radius-lg, 12px); font-weight: 600; background: linear-gradient(135deg, #6c5ce7, #a29bfe); color: #fff; border: none; cursor: pointer; font-size: 1rem;">
              📸 Take Photo
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Wire up capture button
    document.getElementById('btn-scan-capture').addEventListener('click', async () => {
      const captureBtn = document.getElementById('btn-scan-capture');

      let photoData;
      if (window.LifeOSNative && window.LifeOSNative.isNative) {
        photoData = await window.LifeOSNative.takePhoto();
      } else {
        // Web fallback: file input
        photoData = await new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.capture = 'environment';
          input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = () => resolve({ base64: reader.result.split(',')[1], format: 'jpeg' });
              reader.readAsDataURL(file);
            } else {
              resolve(null);
            }
          };
          input.click();
        });
      }

      if (!photoData) return;

      // Show preview
      const preview = document.getElementById('scan-preview');
      preview.innerHTML = `<img src="data:image/${photoData.format || 'jpeg'};base64,${photoData.base64}" style="width:100%; border-radius: var(--radius-md, 8px); max-height: 300px; object-fit: cover;">`;

      // Show analyzing state
      captureBtn.textContent = '🔍 Analyzing...';
      captureBtn.disabled = true;

      try {
        const res = await fetch('/api/food/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64: photoData.base64, format: photoData.format || 'jpeg' })
        });
        const data = await res.json();

        if (data.success && data.foods && data.foods.length > 0) {
          _showScanResults(data.foods, data.demo, refreshCb);
          if (window.LifeOSNative) window.LifeOSNative.vibrate();
        } else {
          document.getElementById('scan-results').innerHTML = `
            <div style="text-align:center; padding: 1rem; color: var(--text-secondary, #a0a0b8);">
              <p>😕 No food items detected. Try a clearer photo or add food manually.</p>
            </div>
          `;
          document.getElementById('scan-results').style.display = 'block';
        }
      } catch (err) {
        console.error('Food scan error:', err);
        document.getElementById('scan-results').innerHTML = `
          <div style="text-align:center; padding: 1rem; color: var(--accent-danger, #e17055);">
            <p>❌ Scanning failed. Please try again or add food manually.</p>
          </div>
        `;
        document.getElementById('scan-results').style.display = 'block';
      } finally {
        captureBtn.textContent = '📸 Retake Photo';
        captureBtn.disabled = false;
      }
    });
  }

  function _showScanResults(foods, isDemo, refreshCb) {
    const resultsEl = document.getElementById('scan-results');

    let html = isDemo ? '<p style="color: var(--text-secondary, #a0a0b8); font-size: 0.8rem; margin-bottom: 0.75rem;">📋 Demo mode — showing estimated values</p>' : '';
    html += '<div class="scan-results-list">';

    foods.forEach((food, i) => {
      html += `
        <div class="scan-result-item" style="background: var(--bg-glass, rgba(255,255,255,0.05)); border: 1px solid var(--border-light, rgba(255,255,255,0.1)); border-radius: var(--radius-md, 8px); padding: 0.875rem; margin-bottom: 0.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>${food.name}</strong>
              <span style="color: var(--text-secondary, #a0a0b8); font-size: 0.85rem;"> — ${food.quantity} ${food.unit}</span>
            </div>
            <span style="color: var(--accent-primary, #6c5ce7); font-weight: 600;">${food.estimatedCalories} cal</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-secondary, #a0a0b8); margin-top: 0.25rem;">
            P: ${food.protein}g · C: ${food.carbs}g · F: ${food.fat}g · Fiber: ${food.fiber}g
          </div>
          <button class="scan-add-item-btn" data-scan-idx="${i}" style="margin-top: 0.5rem; padding: 0.375rem 0.75rem; border-radius: var(--radius-sm, 6px); font-size: 0.8rem; background: linear-gradient(135deg, #6c5ce7, #a29bfe); color: #fff; border: none; cursor: pointer; font-weight: 600;">
            ✅ Add to Log
          </button>
        </div>
      `;
    });

    html += '</div>';
    html += `<button id="scan-add-all-btn" style="width:100%; margin-top: 0.75rem; padding: 0.75rem; border-radius: var(--radius-lg, 12px); font-weight: 600; background: linear-gradient(135deg, #00cec9, #55efc4); color: #0a0a0f; border: none; cursor: pointer; font-size: 0.95rem;">Add All Items</button>`;

    resultsEl.innerHTML = html;
    resultsEl.style.display = 'block';

    // Store scanned foods for adding
    _scannedFoods = foods;

    // Bind individual add buttons
    resultsEl.querySelectorAll('.scan-add-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.scanIdx, 10);
        _addScannedItem(idx, refreshCb);
      });
    });

    // Bind add-all button
    document.getElementById('scan-add-all-btn').addEventListener('click', () => {
      _addAllScanned(refreshCb);
    });
  }

  function _addScannedItem(index, refreshCb) {
    const food = _scannedFoods[index];
    if (!food) return;
    const todayDate = today();
    const meal = _guessMealFromTime();

    log.add({
      foodName: food.name,
      calories: food.estimatedCalories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      fiber: food.fiber,
      servingSize: `${food.quantity} ${food.unit}`,
      servingCount: 1,
      meal: meal,
      date: todayDate
    });

    if (typeof App !== 'undefined' && App.toast) App.toast(`✅ Added ${food.name}!`, 'success');

    // Grey out the added item
    const items = document.querySelectorAll('.scan-result-item');
    if (items[index]) {
      items[index].style.opacity = '0.5';
      const btn = items[index].querySelector('.scan-add-item-btn');
      if (btn) {
        btn.disabled = true;
        btn.textContent = '✓ Added';
      }
    }
  }

  function _addAllScanned(refreshCb) {
    if (!_scannedFoods) return;
    _scannedFoods.forEach((food, i) => {
      _addScannedItem(i, refreshCb);
    });
    setTimeout(() => {
      document.getElementById('food-scan-overlay')?.remove();
      if (typeof App !== 'undefined') {
        App.toast(`🍽️ Added ${_scannedFoods.length} items from scan!`, 'success');
        if (refreshCb) refreshCb();
        if (App.navigate) App.navigate('food');
      } else if (refreshCb) {
        refreshCb();
      }
    }, 500);
  }

  /* ── Public API ─────────────────────────────────────────────────────────── */
  return {
    database,
    log,
    meals: MEALS,
    goals,
    scanner,
    search,
    analytics,
    workouts,
    render,
    seedIfNeeded,
    scanFood,
  };
})();
