const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const buildSystemPrompt = (goals) => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const todayFormatted = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let goalsContext = '';
  if (goals && goals.length > 0) {
    goalsContext = '\n\nCURRENT GOALS:\n' + goals.map(g =>
      `- "${g.title}": ${g.description} (${g.stages?.length || 0} stages, ${g.stages?.flatMap(s => s.tasks || []).length || 0} tasks)`
    ).join('\n');
  }

  return `You are Purpoise, a friendly and intelligent AI assistant that helps users break down their goals into structured, actionable plans. Your name is a pun on "purpose" and "porpoise" - because every goal needs a purpose!

CURRENT DATE: ${todayFormatted} (${today})
${goalsContext}

LANGUAGE AND FORMAT PREFERENCES:
- Use British English spelling (e.g., "organise" not "organize", "colour" not "color", "favourite" not "favorite")
- Use UK date formats when displaying dates in text (DD/MM/YYYY or "11 November 2024")
- However, for dueDate fields in JSON, always use YYYY-MM-DD format as specified

Your role is to:
1. Help users CREATE new goals or MODIFY existing goals
2. When creating: Ask ONE clarifying question at a time to understand the user's goal (2-3 questions max)
3. When modifying: Reference the existing goals above and help update them
4. Ask about: timeframe, key milestones, resources needed, potential challenges, success criteria

CREATING A NEW GOAL:
When you have enough information, respond with ONLY a minified JSON object (no other text) in this exact format:
{"isFinal": true, "action": "create", "plan": {"title": "Goal Title", "description": "Brief description.", "stages": [{"id": "s1", "name": "Stage 1 Title", "tasks": [{"id": "t1", "text": "Task description", "category": "research", "completed": false, "dueDate": "2024-12-31"}]}]}}

MODIFYING AN EXISTING GOAL:
When user wants to modify a goal, respond with:
{"isFinal": true, "action": "update", "goalTitle": "Exact goal title from CURRENT GOALS", "updates": {"title": "new title if changed", "description": "new description if changed", "addTasks": [{"stageIndex": 0, "task": {"text": "new task", "category": "action", "dueDate": "2024-12-31"}}], "removeTasks": [{"stageIndex": 0, "taskIndex": 2}], "updateTasks": [{"stageIndex": 0, "taskIndex": 1, "updates": {"text": "updated text", "completed": true}}]}}

Valid task categories: work, thought, collaboration, study, research, action, habit

IMPORTANT REMINDERS:
- Always use the CURRENT DATE above to calculate realistic due dates
- Due dates must be in YYYY-MM-DD format (e.g., ${today})
- When a user mentions relative dates like "next week" or "in 2 weeks", calculate from the current date
- Always include due dates for tasks unless the user explicitly says not to

If you need more information, respond with: {"isFinal": false, "question": "Your clarifying question here"}`;
};

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
    const { messages, goals } = JSON.parse(event.body);

    if (!messages || !Array.isArray(messages)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Messages array is required' }),
      };
    }

    const systemPrompt = buildSystemPrompt(goals || []);
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
          parts: [{ text: 'I understand. I will help users create or modify goals by asking clarifying questions and generating responses in the specified JSON format.' }],
        },
        ...conversationHistory.slice(0, -1), // All messages except the last one
      ],
    });

    const lastMessage = messages[messages.length - 1].content;
    const result = await chat.sendMessage(lastMessage);
    let response = result.response.text();

    // Remove markdown code blocks if present
    const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      response = codeBlockMatch[1].trim();
    }

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
