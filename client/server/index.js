import 'dotenv/config';

import cors from 'cors';
import express from 'express';
import { AccountAddress, Hex, Network } from '@aptos-labs/ts-sdk';
import { ShelbyNodeClient } from '@shelby-protocol/sdk/node';

const port = Number(process.env.PORT || 8787);

const apiKey = process.env.SHELBY_API_KEY || process.env.REACT_APP_SHELBY_API_KEY;
if (!apiKey) {
  // Don't throw: keep server up but return 500 for requests.
  console.warn('[Shelby][Server] Missing SHELBY_API_KEY (or REACT_APP_SHELBY_API_KEY)');
}

const client = apiKey
  ? new ShelbyNodeClient({
      network: Network.SHELBYNET,
      apiKey,
    })
  : null;

const app = express();

app.use(
  cors({
    origin: [/^http:\/\/localhost:\d+$/],
    credentials: false,
  }),
);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/blobs', async (req, res) => {
  try {
    if (!client) {
      res.status(500).json({ error: 'Missing SHELBY_API_KEY on server' });
      return;
    }

    const accountRaw = String(req.query.account || '').trim();
    if (!accountRaw) {
      res.status(400).json({ error: 'Missing query param: account' });
      return;
    }

    const account = AccountAddress.fromString(accountRaw);

    const blobsRaw = await client.coordination.getAccountBlobs({ account });
    const blobs = (blobsRaw || []).map((b) => {
      const name = typeof b?.name === 'string' ? b.name : String(b?.name || '');
      const blobNameSuffix =
        typeof b?.blobNameSuffix === 'string'
          ? b.blobNameSuffix
          : name.startsWith('@')
            ? name.split('/').slice(1).join('/')
            : '';
      return {
        owner: typeof b?.owner?.toString === 'function' ? b.owner.toString() : String(b?.owner || ''),
        name,
        blobNameSuffix,
        blobMerkleRoot: b?.blobMerkleRoot ? Hex.fromHexInput(b.blobMerkleRoot).toString() : null,
        size: Number(b?.size || 0),
        expirationMicros: Number(b?.expirationMicros || 0),
        creationMicros: Number(b?.creationMicros || 0),
        isWritten: Boolean(b?.isWritten),
      };
    });
    res.json({ blobs });
  } catch (e) {
    res.status(500).json({
      error: e?.message || String(e),
      name: e?.name,
    });
  }
});

app.listen(port, () => {
  console.log(`[Shelby][Server] Listening on http://localhost:${port}`);
});
