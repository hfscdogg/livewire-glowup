import { Resend } from 'resend';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, address } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY not configured');
    // Still return success to not block the user experience
    return res.status(200).json({ ok: true });
  }

  try {
    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: 'Livewire Glow Up <notifications@getlivewire.com>',
      to: 'sales@getlivewire.com',
      subject: `New Glow Up Lead: ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px;">
          <h2 style="color: #FF8C00;">New Glow Up Lead</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555;">Name</td>
              <td style="padding: 8px 0;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555;">Email</td>
              <td style="padding: 8px 0;"><a href="mailto:${email}">${email}</a></td>
            </tr>
            ${phone ? `<tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555;">Phone</td>
              <td style="padding: 8px 0;"><a href="tel:${phone}">${phone}</a></td>
            </tr>` : ''}
            ${address ? `<tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555;">Address</td>
              <td style="padding: 8px 0;">${address}</td>
            </tr>` : ''}
          </table>
          <p style="color: #999; font-size: 12px; margin-top: 20px;">
            This lead came from the Livewire Glow Up tool.
          </p>
        </div>
      `,
    });

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('Email send error:', err);
    // Return success anyway — don't penalize the user for an email failure
    return res.status(200).json({ ok: true });
  }
}
