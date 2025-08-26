// api/chat.js - Vercel serverless function
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, userMessage, conversationHistory } = req.body;

  // Your OpenAI API key (in production, use environment variables)
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  try {
    // Build messages array for OpenAI
    const chatMessages = [
      {
        role: "system",
        content: `You are Dr. Sarah, a warm, empathetic, and professional school guidance counselor with 15 years of experience working with students aged 12-18. 

Your approach:
- Warm, caring, and non-judgmental
- Use age-appropriate language  
- Keep responses 2-3 sentences max
- Ask thoughtful follow-up questions
- Validate emotions while providing gentle guidance
- Focus on practical solutions for school-related issues
- If you detect signs of bullying, self-harm, abuse, or serious issues, express appropriate concern and encourage seeking help from trusted adults

You are currently chatting with a student in a confidential setting through the school app. Be supportive, professional, and helpful.`
      }
    ];

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.slice(-6).forEach(msg => {
        chatMessages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.message
        });
      });
    }

    // Add current message
    chatMessages.push({
      role: 'user',
      content: userMessage
    });

    console.log('Calling OpenAI with messages:', chatMessages);

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: chatMessages,
        max_tokens: 200,
        temperature: 0.7,
        top_p: 0.9
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API Error:', errorText);
      throw new Error(`OpenAI API failed: ${openaiResponse.status}`);
    }

    const data = await openaiResponse.json();
    console.log('OpenAI Response:', data);

    if (data.choices && data.choices[0] && data.choices[0].message) {
      const aiResponse = data.choices[0].message.content.trim();
      
      return res.status(200).json({ 
        response: aiResponse,
        success: true 
      });
    } else {
      throw new Error('Unexpected OpenAI response structure');
    }

  } catch (error) {
    console.error('Server Error:', error);
    
    // Return a fallback response
    const fallbackResponse = getFallbackResponse(userMessage);
    
    return res.status(200).json({ 
      response: fallbackResponse,
      success: false,
      error: error.message,
      fallback: true
    });
  }
}

// Fallback response function
function getFallbackResponse(userMessage) {
  const message = userMessage.toLowerCase();
  
  if (message.includes('hi') || message.includes('hello')) {
    return "Hi there! I'm Dr. Sarah, your school guidance counselor. I'm here to listen and support you. How are you feeling today?";
  } else if (message.includes('bully') || message.includes('bullied')) {
    return "I'm sorry to hear someone is treating you poorly. Bullying is never acceptable, and you don't deserve this treatment. Can you tell me more about what's been happening?";
  } else if (message.includes('sad') || message.includes('upset')) {
    return "I can hear that you're feeling really sad right now. Those feelings are completely valid. What's been weighing on your heart lately?";
  } else if (message.includes('help')) {
    return "I'm here to help and support you. Whatever you're going through, we can work through it together. What kind of help do you need?";
  } else {
    return "I'm here to listen and support you. Can you tell me more about what's on your mind?";
  }
}