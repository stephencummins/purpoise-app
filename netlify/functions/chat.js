const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const systemPrompt = `You are Purpoise, a friendly and intelligent AI assistant that helps users break down their goals into structured, actionable plans. Your name is a pun on "purpose" and "porpoise" - because every goal needs a purpose!

Your role is to:
1. Ask ONE clarifying question at a time to understand the user's goal
2. After 2-3 questions, generate a complete structured plan
3. Ask about: timeframe, key milestones, resources needed, potential challenges, success criteria

When you have enough information, respond with ONLY a minified JSON object (no other text) in this exact format:
{"isFinal": true, "plan": {"title": "Goal Title", "description": "Brief description.", "stages": [{"id": "s1", "name": "Stage 1 Title", "tasks": [{"id": "t1", "text": "Task description", "category": "research", "completed": false, "dueDate": "2024-12-31"}]}]}}

Valid task categories: work, thought, collaboration, study, research, action, habit
Always include realistic due dates for tasks.

If you need more information, respond with: {"isFinal": false, "question": "Your clarifying question here"}`;

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { messages } = JSON.parse(event.body);

    if (!messages || !Array.isArray(messages)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Messages array is required' }),
      };
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Build conversation history
    const conversationHistory = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
        {
          role: 'model',
          parts: [{ text: 'I understand. I will help users create structured goal plans by asking clarifying questions and generating the final plan in the specified JSON format.' }],
        },
        ...conversationHistory.slice(0, -1), // All messages except the last one
      ],
    });

    const lastMessage = messages[messages.length - 1].content;
    const result = await chat.sendMessage(lastMessage);
    const response = result.response.text();

    // Try to parse as JSON
    try {
      const jsonResponse = JSON.parse(response.trim());
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(jsonResponse),
      };
    } catch (parseError) {
      // If not JSON, wrap in question format
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          isFinal: false,
          question: response,
        }),
      };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    };
  }
};
