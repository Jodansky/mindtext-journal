import OpenAI from 'openai';

const summaryPrompt = `You are MindText, an AI that reflects on a person's private journal entry (only their own words) with warmth and clarity.
- Write directly to them in the second person.
- Open with the feeling or theme you sense, then offer a fuller reflection in 2-4 flowing sentences that explore why they might feel that way and a supportive intention or reframe.
- You can vary structure (one thoughtful paragraph or two short ones) and lean into sensory or future-focused imagery when helpful.
- Avoid stiff rules, avoid quoting dialogue, and never refer to yourself or MindText.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ message: 'Missing OPENAI_API_KEY environment variable.' });
  }

  const rawEntry = req.body?.entryText ?? req.body?.transcript ?? '';
  if (!rawEntry || !rawEntry.trim()) {
    return res.status(400).json({ message: 'Entry text is required.' });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.6,
      max_tokens: 420,
      messages: [
        { role: 'system', content: summaryPrompt },
        { role: 'user', content: rawEntry.trim() },
      ],
    });

    const summary = completion.choices?.[0]?.message?.content?.trim();
    if (!summary) {
      throw new Error('Cannot generate a summary.');
    }

    return res.status(200).json({ summary });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to summarize entry.' });
  }
}
