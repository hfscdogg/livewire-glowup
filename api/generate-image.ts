import { GoogleGenAI } from '@google/genai';

const stylePrompts: Record<string, string> = {
  warm: `Warm, inviting outdoor lighting with a cozy amber glow. The house should look beautiful and welcoming at night -- like the best version of "coming home late in the evening." Soft warm light on the house, a lit walkway, and a gentle glow from the windows.`,
  dramatic: `Bold, high-end outdoor lighting with strong contrast. The house should look stunning and impressive at night -- like a luxury real estate photo. Bright highlights on the architecture with deep shadows between them.`,
  elegant: `Refined, understated outdoor lighting. The house should look peaceful and luxurious at night -- soft light on the facade, gentle path lighting, nothing overdone. Every light feels intentional.`,
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image, style, address } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Image is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Validate and parse data URL
    const match = image.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid image format' });
    }
    const [, mimeType, base64Data] = match;

    const styleGuide = stylePrompts[style] || stylePrompts.warm;
    const addressContext = address ? ` This is the property at ${address}.` : '';

    const prompt = `Transform this daytime house photo into a nighttime scene with beautiful outdoor lighting.

The sky MUST be fully dark -- black or deep navy, not dusk or twilight. No sunset glow. It should look like 10 PM, hours after sunset.

${styleGuide}${addressContext}

Keep the house, landscaping, and surroundings exactly as they are -- only change the time of day and add outdoor lighting. Do not add light fixtures that look unrealistic or overly specific (no lights shining down from gables, no visible fixture hardware). The lighting should look natural and aspirational, like a gorgeous after-dark real estate photo.

The goal is to make the homeowner think "wow, my house could look like THAT at night?" -- not to deliver a detailed lighting plan.

Do NOT add any text, logos, watermarks, or overlays.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    let afterImage = '';
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        const responseMime = part.inlineData.mimeType || 'image/png';
        afterImage = `data:${responseMime};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!afterImage) {
      return res.status(500).json({ error: 'No image was generated' });
    }

    return res.status(200).json({ afterImage });
  } catch (err: any) {
    console.error('Image generation error:', err);
    return res.status(500).json({ error: err.message || 'Image generation failed' });
  }
}
