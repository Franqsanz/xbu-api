import { ReportRepository, ReportType, CreateReportInput } from '../repositories/reportRepository';
import { BookRepository } from '../repositories/bookRepository';
import { UserRepository } from '../repositories/userRepository';
import { resend } from '../config/resend';
import { ADMIN_EMAIL, REPORTS_FROM_EMAIL } from '../config/env';
import { BadRequest, NotFound, TooManyRequests } from '../utils/errors';

const REPORT_TYPES: ReportType[] = ['copyright', 'inappropriate', 'spam', 'other'];
const MAX_REPORTS_PER_DAY = 5;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TYPE_LABEL: Record<ReportType, string> = {
  copyright: 'Copyright / derechos de autor',
  inappropriate: 'Contenido inapropiado',
  spam: 'Spam',
  other: 'Otro',
};

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function notifyAdmin(payload: {
  book: any;
  bookOwner: any;
  reporter: any;
  type: ReportType;
  description?: string;
  contactEmail?: string;
  reportId: string;
}) {
  if (!resend || !ADMIN_EMAIL) return;

  const from = REPORTS_FROM_EMAIL ?? 'onboarding@resend.dev';
  const { book, bookOwner, reporter, type, description, contactEmail, reportId } = payload;
  const subject = `[XBuReads] Nuevo reporte de libro (${TYPE_LABEL[type]})`;
  const ownerName = escapeHtml(bookOwner?.name || bookOwner?.username || '(sin nombre)');
  const ownerHandle = bookOwner?.username ? ` (@${escapeHtml(bookOwner.username)})` : '';
  const ownerUid = escapeHtml(bookOwner?.uid || book?.userId || '?');
  const ownerEmail = escapeHtml(bookOwner?.email || 'sin email');
  const ownerLine = `${ownerName}${ownerHandle} — <code>${ownerUid}</code>, ${ownerEmail}`;
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px;">
      <h2 style="margin:0 0 12px">Nuevo reporte de libro</h2>
      <p><strong>Tipo:</strong> ${escapeHtml(TYPE_LABEL[type])}</p>
      <p><strong>Libro:</strong> ${escapeHtml(book?.title ?? '?')} — <code>${escapeHtml(book?._id?.toString() ?? '')}</code></p>
      <p><strong>Publicado por:</strong> ${ownerLine}</p>
      <p><strong>Reportado por:</strong> ${escapeHtml(reporter?.name ?? '?')} (<code>${escapeHtml(reporter?.uid ?? '?')}</code>, ${escapeHtml(reporter?.email ?? 'sin email')})</p>
      <p><strong>Email de contacto declarado:</strong> ${escapeHtml(contactEmail ?? '?')}</p>
      ${description ? `<p><strong>Descripción:</strong></p><pre style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:6px">${escapeHtml(description)}</pre>` : ''}
      <p style="color:#666;font-size:12px">ID del reporte: <code>${escapeHtml(reportId)}</code></p>
    </div>
  `;

  try {
    await resend.emails.send({
      from,
      to: ADMIN_EMAIL,
      subject,
      html,
    });
  } catch (err) {
    console.error('[reportService] resend send error:', err);
  }
}

export const ReportService = {
  async reportBook(input: Omit<CreateReportInput, 'reporterId'> & { reporterId: string }) {
    const { bookId, reporterId, type, description, contactEmail } = input;

    if (!REPORT_TYPES.includes(type)) {
      throw BadRequest('Tipo de reporte inválido.');
    }
    if (type === 'other' && !description?.trim()) {
      throw BadRequest('Describí brevemente el motivo del reporte.');
    }
    const trimmedEmail = contactEmail?.trim();
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      throw BadRequest('Ingresá un email de contacto válido.');
    }

    // Rate limit sencillo: max N por 24h por reporter.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await ReportRepository.countByReporterSince(reporterId, since);
    if (recentCount >= MAX_REPORTS_PER_DAY) {
      throw TooManyRequests('Alcanzaste el límite de reportes por hoy. Probá más tarde.');
    }

    const book = await BookRepository.findByIdRaw(bookId);
    if (!book) throw NotFound('Libro no encontrado.');
    if (book.userId === reporterId) {
      throw BadRequest('No podés reportar tu propio libro.');
    }

    const existing = await ReportRepository.findOpenByReporterAndBook(reporterId, bookId);
    if (existing) {
      throw BadRequest('Ya tenés un reporte abierto sobre este libro.');
    }

    const created = await ReportRepository.create({
      bookId,
      reporterId,
      type,
      description: description?.trim() || undefined,
      contactEmail: trimmedEmail,
    });

    // Notificación al admin — fire-and-forget, no bloquea la respuesta al user.
    (async () => {
      const [reporter, bookOwner] = await Promise.all([
        UserRepository.findById(reporterId),
        UserRepository.findByUid!(book.userId),
      ]);
      await notifyAdmin({
        book,
        bookOwner,
        reporter,
        type,
        description,
        contactEmail: trimmedEmail,
        reportId: (created as any)._id?.toString?.() ?? '',
      });
    })().catch((err) => console.error('[reportService.notifyAdmin] failed:', err));

    return created;
  },
};
