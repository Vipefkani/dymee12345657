import { createHmac, timingSafeEqual } from 'node:crypto';
import { handleUpload } from '@vercel/blob/client';

const maximumSizes = {
  avatar: 5 * 1024 * 1024,
  post: 50 * 1024 * 1024,
  story: 50 * 1024 * 1024,
  chat: 20 * 1024 * 1024,
  sticker: 3 * 1024 * 1024,
};

function verifyClientPayload(token) {
  if (typeof token !== 'string') throw new Error('Invalid upload authorization.');
  const parts = token.split('.');
  const [encoded, signature] = parts;
  if (parts.length !== 2 || !encoded || !signature || !process.env.BLOB_UPLOAD_SIGNING_SECRET) {
    throw new Error('Invalid upload authorization.');
  }
  const expected = createHmac('sha256', process.env.BLOB_UPLOAD_SIGNING_SECRET)
    .update(encoded)
    .digest('hex');
  const receivedBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (
    receivedBytes.length !== expectedBytes.length
    || !timingSafeEqual(receivedBytes, expectedBytes)
  ) {
    throw new Error('Invalid upload authorization.');
  }
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  if (
    !maximumSizes[payload.purpose]
    || !Number.isSafeInteger(payload.size)
    || payload.size <= 0
    || payload.size > maximumSizes[payload.purpose]
    || payload.exp <= Math.floor(Date.now() / 1000)
    || payload.path !== `uploads/${payload.purpose}/${payload.id}/${payload.path.split('/').at(-1)}`
    || !/^[A-Za-z0-9._-]+$/.test(payload.path.split('/').at(-1))
  ) {
    throw new Error('Invalid upload authorization.');
  }
  return payload;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const result = await handleUpload({
      body: request.body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = verifyClientPayload(clientPayload);
        if (pathname !== payload.path) throw new Error('Upload path does not match authorization.');
        return {
          access: 'private',
          addRandomSuffix: false,
          allowOverwrite: false,
          allowedContentTypes: [payload.content_type],
          maximumSizeInBytes: payload.size,
          tokenPayload: clientPayload,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = verifyClientPayload(tokenPayload);
        if (blob.pathname !== payload.path) throw new Error('Completed upload path mismatch.');
        const origin = process.env.BLOB_APP_ORIGIN;
        if (!origin || !origin.startsWith('https://')) {
          throw new Error('Blob completion callback is not configured.');
        }
        const callback = await fetch(`${origin.replace(/\/+$/, '')}/uploads/complete/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tokenPayload, pathname: blob.pathname }),
        });
        if (!callback.ok) throw new Error('Dymee could not verify the completed upload.');
      },
    });
    return response.status(200).json(result);
  } catch (error) {
    console.error('Vercel Blob client upload failed:', error);
    return response.status(400).json({ error: 'The upload could not be authorized or completed.' });
  }
}
