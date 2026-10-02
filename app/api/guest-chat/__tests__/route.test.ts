/** @jest-environment node */

import { POST } from '../route';

const originalApiKey = process.env.OLLAMA_API_KEY;

function guestRequest(payload: unknown) {
  return new Request('http://localhost/api/guest-chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

describe('POST /api/guest-chat', () => {
  afterAll(() => {
    process.env.OLLAMA_API_KEY = originalApiKey;
  });

  it('sends the selected allowlisted model and conversation to Ollama', async () => {
    process.env.OLLAMA_API_KEY = 'test-key';
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValueOnce(Response.json({
      message: { content: 'Model answer' },
    }));

    const response = await POST(guestRequest({
      model: 'gpt-oss-120b',
      systemPrompt: 'Be concise',
      messages: [
        { role: 'user', text: 'First question' },
        { role: 'assistant', text: 'First answer' },
        { role: 'user', text: 'Follow-up question' },
      ],
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ text: 'Model answer' });
    expect(fetchMock).toHaveBeenCalledWith('https://ollama.com/api/chat', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
    }));
    const requestBody = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(requestBody.model).toBe('gpt-oss:120b');
    expect(requestBody.messages).toEqual([
      { role: 'system', content: 'Be concise' },
      { role: 'user', content: 'First question' },
      { role: 'assistant', content: 'First answer' },
      { role: 'user', content: 'Follow-up question' },
    ]);
    fetchMock.mockRestore();
  });

  it('rejects models outside the allowed list', async () => {
    process.env.OLLAMA_API_KEY = 'test-key';
    const response = await POST(guestRequest({
      model: 'yandexgpt',
      messages: [{ role: 'user', text: 'Hello' }],
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid model' });
  });
});
