import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { writeFileSync, mkdirSync, existsSync, createReadStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ordersDir = join(__dirname, 'data', 'orders');
const referenceWorkbook = join(
  __dirname,
  '..',
  'reference',
  'Copy of 1.18 One Prep - 2024 WESTERN EOF.xlsx',
);
const referenceWorkbookName = 'Copy of 1.18 One Prep - 2024 WESTERN EOF.xlsx';

if (!existsSync(ordersDir)) {
  mkdirSync(ordersDir, { recursive: true });
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/reference/workbook', (_req, res) => {
  if (!existsSync(referenceWorkbook)) {
    res.status(404).json({ error: 'Reference workbook not found' });
    return;
  }

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${referenceWorkbookName}"`,
  );
  createReadStream(referenceWorkbook).pipe(res);
});

app.post('/api/orders', (req, res) => {
  const { program, dealer, payment, lineItems, summary } = req.body;

  if (!dealer?.accountNumber || !dealer?.dealerName) {
    res.status(400).json({ error: 'Account number and dealer name are required' });
    return;
  }

  if (!lineItems?.length) {
    res.status(400).json({ error: 'Order must contain at least one line item' });
    return;
  }

  const id = randomUUID();
  const order = {
    id,
    submittedAt: new Date().toISOString(),
    program,
    dealer,
    payment,
    lineItems,
    summary,
  };

  writeFileSync(join(ordersDir, `${id}.json`), JSON.stringify(order, null, 2));

  res.status(201).json({
    id,
    message: `Order ${id.slice(0, 8)} submitted successfully for ${dealer.dealerName}`,
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Order API running on http://localhost:${PORT}`);
});
