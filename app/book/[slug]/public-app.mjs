import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createBookingEmbed } from '@/lib/jovabook-embed.mjs';

export const publicApp = createBookingEmbed({
  standalone: true,
  canonical: true,
  readShell: () => readFile(path.join(process.cwd(), 'booking-demo/dist/index.html'), 'utf8'),
});
