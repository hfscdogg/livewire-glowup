import { GoogleGenAI } from '@google/genai';

const stylePrompts: Record<string, string> = {
  warm: `TIME OF DAY: 11:00 PM, hours after sunset. Pitch-black night sky (#000814 to #001233), stars visible. The scene is DARK -- the only illumination comes from the landscape lighting fixtures and interior window glow. Everything outside the light beams is in deep shadow.
    LIGHTING DESIGN: Soft amber architectural uplighting (2700K) washing up the facade, warm path lighting along walkways, gentle warm-white accent lights tucked into landscaping, warm interior glow through windows.
    MOOD: Welcoming, cozy, like arriving home late in the evening. The house glows like a lantern against total darkness.`,
  dramatic: `TIME OF DAY: 10:30 PM, hours after sunset. Pitch-black night sky (#000814 to #001233). The scene is DARK -- areas not hit by a light beam should be in deep shadow, nearly black. No ambient daylight, no sun, no sunset colors.
    LIGHTING DESIGN: High-contrast architectural lighting with bold uplighting on key facade features, sharp beam angles, dramatic shadows, cool-white accent spotlights (3500K-4000K) picking out architectural details, mixed with warm uplights (2700K).
    MOOD: Contemporary, cinematic, impressive. Think high-end real estate photography shot well after dark -- the lighting is the star of the shot.`,
  elegant: `TIME OF DAY: 10:00 PM, hours after sunset. Pitch-black night sky (#000814 to #001233) with stars. The scene is DARK -- illumination comes only from designed lighting and soft moonlight. No daylight whatsoever.
    LIGHTING DESIGN: Gentle moonlighting filtering through trees, soft architectural wash lighting on the facade, delicate path lights, understated accent lighting. Pools of light and shadow, nothing overdone.
    MOOD: Peaceful, luxurious, serene. A quiet evening with the house perfectly lit against the night sky.`,
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

    const prompt = `CRITICAL INSTRUCTION -- READ FIRST: The input image was taken in daylight. You must transform it into a NIGHTTIME scene. This is the single most important requirement. The output MUST depict the exact same house at night, hours after sunset, with a black sky. If the output looks like daytime, dusk, twilight, golden hour, sunset, or "blue hour," you have FAILED the task.

HARD REQUIREMENTS for the output image:
- Sky: completely black or deep navy (#000814 to #001233). Stars may be visible. NO sun, NO clouds lit by sun, NO blue daytime sky, NO orange/pink sunset, NO lingering dusk glow on the horizon.
- Ambient light level: very low. Surfaces not directly hit by a designed light fixture should fall into deep shadow.
- No daylight illumination on the house, lawn, trees, driveway, or street. Shadows should be consistent with artificial point-source lighting, not the sun.
- The designed landscape lighting is the PRIMARY light source and the visual focus of the image.

You are an expert landscape lighting designer transforming a daytime real estate photo into an after-dark showcase of outdoor lighting design.

${styleGuide}${addressContext}

ARCHITECTURAL FIDELITY: Maintain the EXACT architectural structure, proportions, rooflines, windows, doors, materials, and landscaping layout of the input image. Do not alter the building shape or move any elements. Only change the time of day and add lighting.

Final output should look like a professional real estate photograph shot well after dark, purpose-built to sell the lighting design.

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
