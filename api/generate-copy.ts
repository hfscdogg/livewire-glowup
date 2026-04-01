import Anthropic from '@anthropic-ai/sdk';

const styleDescriptions: Record<string, string> = {
  warm: 'warm and welcoming with soft amber tones',
  dramatic: 'modern and dramatic with bold contrasts',
  elegant: 'subtle and elegant with refined moonlighting',
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { style, address } = req.body;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  try {
    const client = new Anthropic({ apiKey });
    const styleName = styleDescriptions[style] || styleDescriptions.warm;
    const addressContext = address
      ? `The property is located at ${address}.`
      : 'The property is a luxury home in Central Virginia.';

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `You are a copywriter for Livewire, a premium landscape lighting company in Central Virginia.

Write a 2-3 sentence description of the lighting design we've created for this homeowner's property. The style is ${styleName}. ${addressContext}

Be specific about lighting techniques (uplighting, path lighting, moonlighting, accent lighting).
Mention how it enhances curb appeal and security.
Keep it conversational and aspirational — this is for the homeowner, not a technical spec.
Do NOT use markdown. Just plain text sentences.`,
        },
      ],
    });

    const textBlock = message.content.find((b: any) => b.type === 'text');
    const description = textBlock ? (textBlock as any).text : '';

    return res.status(200).json({ description });
  } catch (err: any) {
    console.error('Copy generation error:', err);
    return res.status(500).json({ error: err.message || 'Copy generation failed' });
  }
}
