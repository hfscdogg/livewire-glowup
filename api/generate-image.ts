import { GoogleGenAI } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from './lib/supabase';

const stylePrompts: Record<string, string> = {
  warm: `Warm, inviting outdoor lighting with a cozy amber glow. The house should look beautiful and welcoming at night -- like the best version of "coming home late in the evening." Soft warm light on the house, a lit walkway, and a gentle glow from the windows.`,
  dramatic: `Bold, high-end outdoor lighting with strong contrast. The house should look stunning and impressive at night -- like a luxury real estate photo. Bright highlights on the architecture with deep shadows between them.`,
  elegant: `Refined, understated outdoor lighting. The house should look peaceful and luxurious at night -- soft light on the facade, gentle path lighting, nothing overdone. Every light feels intentional.`,
};

const styleDescriptions: Record<string, string> = {
  warm: 'warm and welcoming with soft amber tones',
  dramatic: 'modern and dramatic with bold contrasts',
  elegant: 'subtle and elegant with refined moonlighting',
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image, style, address } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Image is required' });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!geminiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }
  if (!anthropicKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const anthropic = new Anthropic({ apiKey: anthropicKey });

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

    // Run Gemini image generation and Claude copy generation in parallel
    const styleName = styleDescriptions[style] || styleDescriptions.warm;
    const copyAddressContext = address
      ? `The property is located at ${address}.`
      : 'The property is a luxury home in Central Virginia.';

    const [geminiResponse, copyMessage] = await Promise.all([
      ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: prompt },
          ],
        },
        config: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `You are a copywriter for Livewire, a premium landscape lighting company in Central Virginia.

Write a 2-3 sentence description of the lighting design we've created for this homeowner's property. The style is ${styleName}. ${copyAddressContext}

Be specific about lighting techniques (uplighting, path lighting, moonlighting, accent lighting).
Mention how it enhances curb appeal and security.
Keep it conversational and aspirational — this is for the homeowner, not a technical spec.
Do NOT use markdown. Just plain text sentences.`,
          },
        ],
      }),
    ]);

    // Extract after image from Gemini response
    let afterBase64 = '';
    let afterMime = 'image/png';
    for (const part of geminiResponse.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        afterBase64 = part.inlineData.data;
        afterMime = part.inlineData.mimeType || 'image/png';
        break;
      }
    }

    if (!afterBase64) {
      return res.status(500).json({ error: 'No image was generated' });
    }

    // Extract description from Claude response
    const textBlock = copyMessage.content.find((b: any) => b.type === 'text');
    const description = textBlock ? (textBlock as any).text : '';

    // Create lead record in Supabase
    const { data: lead, error: dbError } = await supabase
      .from('leads')
      .insert({
        style: style || 'warm',
        address: address || null,
        description,
        before_image_url: '',
        after_image_url: '',
      })
      .select('id')
      .single();

    if (dbError || !lead) {
      console.error('DB insert error:', dbError);
      return res.status(500).json({ error: 'Failed to save lead record' });
    }

    const leadId = lead.id;

    // Upload before and after images to Supabase Storage
    const beforeBuffer = Buffer.from(base64Data, 'base64');
    const afterBuffer = Buffer.from(afterBase64, 'base64');

    const ext = mimeType.includes('png') ? 'png' : 'jpg';

    const [beforeUpload, afterUpload] = await Promise.all([
      supabase.storage
        .from('glowups')
        .upload(`${leadId}/before.${ext}`, beforeBuffer, {
          contentType: mimeType,
          upsert: true,
        }),
      supabase.storage
        .from('glowups')
        .upload(`${leadId}/after.png`, afterBuffer, {
          contentType: afterMime,
          upsert: true,
        }),
    ]);

    if (beforeUpload.error) {
      console.error('Before image upload error:', beforeUpload.error);
    }
    if (afterUpload.error) {
      console.error('After image upload error:', afterUpload.error);
    }

    // Get public URLs
    const { data: beforeUrlData } = supabase.storage
      .from('glowups')
      .getPublicUrl(`${leadId}/before.${ext}`);
    const { data: afterUrlData } = supabase.storage
      .from('glowups')
      .getPublicUrl(`${leadId}/after.png`);

    // Update lead record with image URLs
    await supabase
      .from('leads')
      .update({
        before_image_url: beforeUrlData.publicUrl,
        after_image_url: afterUrlData.publicUrl,
      })
      .eq('id', leadId);

    return res.status(200).json({ leadId, description });
  } catch (err: any) {
    console.error('Generation error:', err);
    return res.status(500).json({ error: err.message || 'Generation failed' });
  }
}
