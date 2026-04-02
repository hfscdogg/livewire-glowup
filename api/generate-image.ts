import { GoogleGenAI } from '@google/genai';

const stylePrompts: Record<string, string> = {
  warm: `Transform this house into an inviting warm evening scene. Add soft amber-toned architectural uplighting on the facade,
    warm path lighting along walkways, and gentle warm-white accent lights in landscaping. The mood should feel welcoming and cozy.
    Use warm color temperatures (2700K-3000K feel). Soft glow from windows if visible.`,
  dramatic: `Transform this house into a striking modern nighttime scene. Add high-contrast architectural lighting with bold uplighting
    on key facade features, dramatic shadows, cool-white accent spotlights on architectural details, and sharp beam angles.
    The mood should feel contemporary and impressive. Mix of warm uplights and cooler accent spots.`,
  elegant: `Transform this house into a refined dusk scene with subtle, sophisticated lighting. Add gentle moonlighting filtering
    through trees, soft architectural wash lighting on the facade, delicate path lights, and understated accent lighting.
    The mood should feel peaceful and luxurious. Nothing overdone — every light placed with intention.`,
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

    const prompt = `You are an expert landscape lighting designer. ${styleGuide}${addressContext}

Maintain the EXACT architectural structure and proportions of the house. Do not alter the building shape, windows, doors, or landscaping layout.
The sky should transition to dusk or early night. Make it look like a professional real estate photography shot.
Do NOT add any text, logos, watermarks, or overlays to the image.`;

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
