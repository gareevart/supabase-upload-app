/** @jest-environment node */
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '../withApiAuth';

jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }));

const getUser = jest.fn();
const handler = jest.fn(async () => NextResponse.json({ ok: true }));
const endpoint = withApiAuth(handler);
const request = new NextRequest('https://example.test', {
  headers: { authorization: 'Bearer test-token' },
});

beforeEach(() => {
  jest.resetAllMocks();
  handler.mockResolvedValue(NextResponse.json({ ok: true }));
  (createServerClient as jest.Mock).mockReturnValue({ auth: { getUser } });
});

it('uses the verified cookie identity first', async () => {
  getUser.mockResolvedValue({ data: { user: { id: 'cookie-user' } }, error: null });
  expect((await endpoint(request)).status).toBe(200);
  expect(handler).toHaveBeenCalledWith(request, { id: 'cookie-user' });
  expect(getUser).toHaveBeenCalledTimes(1);
});

it('accepts a verified bearer when the cookie session is absent', async () => {
  getUser.mockResolvedValueOnce({ data: { user: null } })
    .mockResolvedValueOnce({ data: { user: { id: 'bearer-user' } } });
  expect((await endpoint(request)).status).toBe(200);
  expect(getUser).toHaveBeenLastCalledWith('test-token');
  expect(handler).toHaveBeenCalledWith(request, { id: 'bearer-user' });
});

it('stops before the handler when credentials are rejected', async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: { status: 401 } });
  expect((await endpoint(request)).status).toBe(401);
  expect(handler).not.toHaveBeenCalled();
});

it('stops before the handler when bearer verification is unavailable', async () => {
  getUser.mockResolvedValueOnce({ data: { user: null } })
    .mockRejectedValueOnce(new Error('unavailable'));
  expect((await endpoint(request)).status).toBe(503);
  expect(handler).not.toHaveBeenCalled();
});
