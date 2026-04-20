import { Resend } from 'resend';
import { supabase } from './lib/supabase.js';

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { leadId, name, email, phone } = req.body;

  if (!leadId || !name || !email) {
    return res.status(400).json({ error: 'leadId, name, and email are required' });
  }

  // Update the lead record with contact info
  const { data: lead, error: dbError } = await supabase
    .from('leads')
    .update({
      name,
      email,
      phone: phone || null,
      captured_at: new Date().toISOString(),
    })
    .eq('id', leadId)
    .select('after_image_url, before_image_url, address')
    .single();

  if (dbError || !lead) {
    console.error('DB update error:', dbError);
    return res.status(500).json({ error: 'Failed to update lead record' });
  }

  // Send notification email to sales (non-blocking)
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const safeName = esc(name);
    const safeEmail = esc(email);
    const safePhone = phone ? esc(phone) : '';
    const safeAddress = lead.address ? esc(lead.address) : '';

    try {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: 'Livewire Glow Up <notifications@getlivewire.com>',
        to: 'sales@getlivewire.com',
        subject: `New Glow Up Lead: ${safeName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px;">
            <h2 style="color: #FF8C00;">New Glow Up Lead</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Name</td>
                <td style="padding: 8px 0;">${safeName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Email</td>
                <td style="padding: 8px 0;"><a href="mailto:${safeEmail}">${safeEmail}</a></td>
              </tr>
              ${safePhone ? `<tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Phone</td>
                <td style="padding: 8px 0;"><a href="tel:${safePhone}">${safePhone}</a></td>
              </tr>` : ''}
              ${safeAddress ? `<tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Address</td>
                <td style="padding: 8px 0;">${safeAddress}</td>
              </tr>` : ''}
            </table>
            <h3 style="margin-top: 24px; color: #333;">Before &amp; After</h3>
            <p><a href="${esc(lead.before_image_url)}">Before Image</a> | <a href="${esc(lead.after_image_url)}">After Image</a></p>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">
              This lead came from the Livewire Glow Up tool.
            </p>
          </div>
        `,
      });
    } catch (err: any) {
      console.error('Email send error:', err);
    }
  }

  return res.status(200).json({ ok: true, afterImageUrl: lead.after_image_url });
}
