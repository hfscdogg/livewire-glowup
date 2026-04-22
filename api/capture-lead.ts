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

  type EmailStatus = {
    userSent: boolean;
    salesSent: boolean;
    skipped?: string;
    userError?: string;
    salesError?: string;
  };
  const emailStatus: EmailStatus = { userSent: false, salesSent: false };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured; skipping email send');
    emailStatus.skipped = 'RESEND_API_KEY not configured';
  } else {
    const safeName = esc(name);
    const safeEmail = esc(email);
    const safePhone = phone ? esc(phone) : '';
    const safeAddress = lead.address ? esc(lead.address) : '';

    const resend = new Resend(apiKey);

    const [userResult, salesResult] = await Promise.allSettled([
      resend.emails.send({
        from: 'Livewire Lighting <hello@getlivewire.com>',
        to: email,
        subject: `${name.split(' ')[0]}, here's your Glow Up ✨`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="text-align: center; padding: 32px 0 16px;">
                <h1 style="color: #1a1a1a; font-size: 28px; margin: 0;">Your Home, in a New Light</h1>
                <p style="color: #888; font-size: 14px; margin-top: 8px;">Here's what professional landscape lighting could look like on your home.</p>
              </div>
              <div style="margin: 24px 0;">
                <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px;">Before</p>
                <img src="${lead.before_image_url}" alt="Your home - before" style="width: 100%; border-radius: 12px;" />
              </div>
              <div style="margin: 24px 0;">
                <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px;">After</p>
                <img src="${lead.after_image_url}" alt="Your home - after" style="width: 100%; border-radius: 12px;" />
              </div>
              <div style="text-align: center; padding: 32px 0;">
                <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
                  Love what you see? Let's talk about making it real.
                </p>
                <a href="https://getlivewire.com/contact" style="background: #FF8C00; color: white; padding: 14px 32px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 15px;">
                  Schedule a Free Consultation
                </a>
              </div>
              <div style="border-top: 1px solid #eee; padding-top: 16px; text-align: center;">
                <p style="color: #bbb; font-size: 11px;">&copy; 2026 Livewire Lighting Design &bull; Central Virginia</p>
              </div>
            </div>
          `,
      }),
      resend.emails.send({
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
      }),
    ]);

    if (userResult.status === 'fulfilled') {
      const { data, error } = userResult.value as { data: { id: string } | null; error: { message?: string; name?: string } | null };
      if (error) {
        console.error('User email Resend error:', error);
        emailStatus.userError = error.message || error.name || 'Resend rejected the send';
      } else {
        emailStatus.userSent = true;
        console.log('User email sent:', data?.id);
      }
    } else {
      console.error('User email threw:', userResult.reason);
      emailStatus.userError = userResult.reason?.message || String(userResult.reason);
    }

    if (salesResult.status === 'fulfilled') {
      const { data, error } = salesResult.value as { data: { id: string } | null; error: { message?: string; name?: string } | null };
      if (error) {
        console.error('Sales email Resend error:', error);
        emailStatus.salesError = error.message || error.name || 'Resend rejected the send';
      } else {
        emailStatus.salesSent = true;
        console.log('Sales email sent:', data?.id);
      }
    } else {
      console.error('Sales email threw:', salesResult.reason);
      emailStatus.salesError = salesResult.reason?.message || String(salesResult.reason);
    }
  }

  return res.status(200).json({ ok: true, afterImageUrl: lead.after_image_url, emailStatus });
}
