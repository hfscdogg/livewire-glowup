import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { batchSend } = vi.hoisted(() => ({
  batchSend: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: class {
    batch = { send: batchSend };
  },
}));

vi.mock('./lib/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: {
                after_image_url: 'https://example.com/after.png',
                before_image_url: 'https://example.com/before.png',
                address: 'TEST RECORD',
              },
              error: null,
            })),
          })),
        })),
      })),
    })),
  },
}));

import handler from './capture-lead.js';

function makeResponse() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
}

function makeRequest() {
  return {
    method: 'POST',
    body: {
      leadId: 'lead-test-123',
      name: 'Resend Test',
      email: 'henry@getlivewire.com',
      phone: '',
    },
  };
}

describe('capture lead email delivery', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 'test-key';
    batchSend.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.RESEND_API_KEY;
  });

  it('submits both messages as one idempotent batch and reports provider acceptance', async () => {
    batchSend.mockResolvedValue({
      data: { data: [{ id: 'customer-id' }, { id: 'sales-id' }] },
      error: null,
    });
    const res = makeResponse();

    await handler(makeRequest(), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ ok: true, emailAccepted: true });
    expect(batchSend).toHaveBeenCalledTimes(1);
    expect(batchSend).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ to: 'henry@getlivewire.com' }),
        expect.objectContaining({ to: 'support@getlivewire.zohodesk.com' }),
      ]),
      { idempotencyKey: 'glowup:lead-test-123:capture-v1' },
    );
  });

  it('reports an SDK-returned provider error instead of treating resolution as success', async () => {
    batchSend.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'sender rejected' },
    });
    const res = makeResponse();

    await handler(makeRequest(), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      emailAccepted: false,
      emailError: 'validation_error',
    });
    expect(console.error).toHaveBeenCalledWith(
      'Resend batch rejected:',
      expect.objectContaining({ name: 'validation_error' }),
    );
  });

  it('surfaces a missing key instead of silently skipping email', async () => {
    delete process.env.RESEND_API_KEY;
    const res = makeResponse();

    await handler(makeRequest(), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      emailAccepted: false,
      emailError: 'not_configured',
    });
    expect(batchSend).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('Resend is not configured');
  });

  it('reports transport failures without exposing the credential', async () => {
    batchSend.mockRejectedValue(new Error('network unavailable'));
    const res = makeResponse();

    await handler(makeRequest(), res);

    expect(res.body).toMatchObject({
      ok: true,
      emailAccepted: false,
      emailError: 'transport_error',
    });
    expect(JSON.stringify(res.body)).not.toContain('test-key');
  });

  it('rejects an incomplete provider acceptance response', async () => {
    batchSend.mockResolvedValue({ data: { data: [{ id: 'only-one' }] }, error: null });
    const res = makeResponse();

    await handler(makeRequest(), res);

    expect(res.body).toMatchObject({
      ok: true,
      emailAccepted: false,
      emailError: 'invalid_provider_response',
    });
  });
});
