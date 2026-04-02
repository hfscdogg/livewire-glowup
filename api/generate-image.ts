import { GoogleGenAI } from '@google/genai';

const stylePrompts: Record<string, string> = {
  warm: `Transform this house into a fully dark nighttime scene. The sky must be completely dark -- deep navy or black, with stars visible. No sunset, no dusk, no twilight glow on the horizon.
    Add soft amber-toned architectural uplighting on the facade, warm path lighting along walkways, and gentle warm-white accent lights in landscaping.
    The lighting should be the only source of illumination -- the house glows against the dark night. Use warm color temperatures (2700K-3000K feel).
    Windows should have a soft interior glow. The mood should feel welcoming and cozy, like arriving home late in the evening.`,
  dramatic: `Transform this house into a fully dark nighttime scene. The sky must be completely dark -- deep navy or black, no sunset or twilight remaining.
    Add high-contrast architectural lighting with bold uplighting on key facade features, dramatic shadows, cool-white accent spotlights on architectural details, and sharp beam angles.
    The lighting should pop against the dark surroundings -- this is about contrast. Mix of warm uplights and cooler accent spots.
    The mood should feel contemporary, impressive, and cinematic. Think high-end real estate photography shot at 10 PM.`,
  elegant: `Transform this house into a fully dark nighttime scene. The sky must be completely dark -- deep navy or black with stars, no dusk or twilight.
    Add gentle moonlighting filtering through trees, soft architectural wash lighting on the facade, delicate path lights, and understated accent lighting.
    The landscape should be softly lit with pools of light and shadow. Nothing overdone -- every light placed with intention.
    The mood should feel peaceful, luxurious, and serene. Like a quiet evening with the house perfectly lit against the night sky.`,
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
The sky MUST be fully dark -- nighttime, not dusk or twilight. No sunset colors on the horizon. The landscape lighting should be the primary visual focus against the dark surroundings.
Make it look like a professional real estate photography shot taken well after dark.
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
