import OpenAI from 'openai';

const systemPrompt = `You are MindText, an attentive journaling companion.
- Respond with a few human, flowing sentences (usually 2–3 and under ~45 words) that mix reflection, gentle insight, and an inviting next question.
- Acknowledge the emotion you sense using fresh language rather than repeating their wording.
- Vary your approach: sometimes ask a specific follow-up, other times offer a grounding exercise, a hopeful reframe, or a small experiment they could try.
- Stay warm, curious, and grounded; never apologize or speak like a bot.`;

const chatModel = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ message: 'Missing OPENAI_API_KEY environment variable.' });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const { prompt, history = [] } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required.' });
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8),
      { role: 'user', content: prompt },
    ];

    const completion = await openai.chat.completions.create({
      model: chatModel,
      messages,
      temperature: 0.6,
      max_tokens: 180,
    });

    const reply = completion.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      throw new Error('OpenAI did not return a response.');
    }

    return res.status(200).json({ message: reply });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to generate response.' });
  }
}
