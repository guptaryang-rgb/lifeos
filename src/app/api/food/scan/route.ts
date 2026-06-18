import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_VISION_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

interface FoodItem {
  name: string;
  quantity: number;
  unit: string;
  estimatedCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export async function POST(request: NextRequest) {
  try {
    const email = await getAuthenticatedUser();
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { base64, format } = body;
    
    if (!base64) {
      return NextResponse.json({ error: 'No image data provided' }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      // Demo mode — return mock food detection
      return NextResponse.json({
        success: true,
        demo: true,
        foods: [
          {
            name: 'Mixed Meal',
            quantity: 1,
            unit: 'serving',
            estimatedCalories: 450,
            protein: 25,
            carbs: 45,
            fat: 18,
            fiber: 5
          }
        ],
        message: 'Food scanner running in demo mode (no API key configured). Showing estimated values.'
      });
    }

    // Call Gemini Vision API
    const geminiResponse = await fetch(GEMINI_VISION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: `Analyze this food image and identify all food items visible. For each item, estimate the nutritional content.

Respond ONLY with a valid JSON array (no markdown, no explanation). Each object in the array must have exactly these fields:
- "name": string (common food name)
- "quantity": number (estimated serving count)
- "unit": string (e.g. "piece", "cup", "slice", "bowl", "plate")
- "estimatedCalories": number (total calories for the quantity)
- "protein": number (grams)
- "carbs": number (grams)
- "fat": number (grams)
- "fiber": number (grams)

If no food is visible, return an empty array [].`
            },
            {
              inlineData: {
                mimeType: `image/${format || 'jpeg'}`,
                data: base64
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024
        }
      })
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error('[Food Scan] Gemini API error:', errText);
      return NextResponse.json({ error: 'Food recognition failed' }, { status: 502 });
    }

    const geminiData = await geminiResponse.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    // Parse the JSON response (strip markdown fencing if present)
    let cleanText = text.trim();
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    
    let foods: FoodItem[];
    try {
      foods = JSON.parse(cleanText);
      if (!Array.isArray(foods)) foods = [];
    } catch {
      console.error('[Food Scan] Failed to parse Gemini response:', cleanText);
      foods = [];
    }

    return NextResponse.json({
      success: true,
      foods,
      message: foods.length > 0 
        ? `Identified ${foods.length} food item${foods.length > 1 ? 's' : ''} in the image.`
        : 'No food items could be identified in the image.'
    });

  } catch (error: any) {
    console.error('[Food Scan] Error:', error);
    return NextResponse.json(
      { error: 'Food scanning failed. Please try again.' },
      { status: 500 }
    );
  }
}
