import { Request, Response, NextFunction } from 'express';

import booksModel from '../../models/books';
import usersModel from '../../models/users';
import { CacheService } from '../../services/cacheService';

const SITEMAP_CACHE_KEY = 'sitemap:xml';
const SITEMAP_TTL = 60 * 60 * 24; // 24 horas

function xmlEscape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function buildSitemap(baseUrl: string): Promise<string> {
  const [books, users] = await Promise.all([
    booksModel.find({}, 'pathUrl updatedAt').sort({ updatedAt: -1 }).lean().exec(),
    usersModel.find({}, 'username createdAt').lean().exec(),
  ]);

  const staticUrls = [
    { loc: `${baseUrl}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${baseUrl}/explore`, changefreq: 'daily', priority: '0.9' },
    { loc: `${baseUrl}/most-viewed`, changefreq: 'daily', priority: '0.8' },
  ];

  const bookUrls = books
    .filter((b: any) => b.pathUrl)
    .map((b: any) => ({
      loc: `${baseUrl}/book/view/${encodeURIComponent(b.pathUrl)}`,
      lastmod: b.updatedAt ? new Date(b.updatedAt).toISOString() : undefined,
      changefreq: 'weekly',
      priority: '0.7',
    }));

  const userUrls = users
    .filter((u: any) => u.username)
    .map((u: any) => ({
      loc: `${baseUrl}/profile/${encodeURIComponent(u.username)}`,
      lastmod: u.createdAt ? new Date(u.createdAt).toISOString() : undefined,
      changefreq: 'weekly',
      priority: '0.5',
    }));

  const allUrls = [...staticUrls, ...bookUrls, ...userUrls];

  const urlEntries = allUrls
    .map((u: any) => {
      const parts = [`    <loc>${xmlEscape(u.loc)}</loc>`];
      if (u.lastmod) parts.push(`    <lastmod>${u.lastmod}</lastmod>`);
      if (u.changefreq) parts.push(`    <changefreq>${u.changefreq}</changefreq>`);
      if (u.priority) parts.push(`    <priority>${u.priority}</priority>`);
      return `  <url>\n${parts.join('\n')}\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${urlEntries}
    </urlset>
  `;
}

async function getSitemap(_req: Request, res: Response, next: NextFunction): Promise<any> {
  try {
    const baseUrl = process.env.BASE_URL_CLIENT || 'https://www.xbureads.com';
    const xml = await CacheService.getOrSet(
      SITEMAP_CACHE_KEY,
      () => buildSitemap(baseUrl),
      SITEMAP_TTL
    );

    res.set('Content-Type', 'application/xml; charset=utf-8');
    return res.status(200).send(xml);
  } catch (err) {
    return next(err) as any;
  }
}

export { getSitemap };
