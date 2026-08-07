import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';

import { buildApp } from './helpers/buildApp';
import { mockSession, clearSession } from './helpers/session';
import { Types } from 'mongoose';
import booksModel from '../src/models/books';
import bookRatingsModel from '../src/models/bookRatings';
import bookProgressModel from '../src/models/bookProgress';
import reportsModel from '../src/models/reports';
import commentsModel from '../src/models/comments';
import favoritesModel from '../src/models/favorites';
import collectionsModel from '../src/models/collections';
import bookStatusesModel from '../src/models/bookStatuses';
import activityLogModel from '../src/models/activityLog';
import notificationsModel from '../src/models/notifications';
import { seedBook } from './helpers/seedBook';

const app = buildApp();

interface BookPayload {
  title: string;
  authors: string[];
  synopsis: string;
  category: string[];
  language: string;
  year: string;
  numberPages: string;
  format: string;
  image: Record<string, string>;
  userId?: string;
}

const VALID_BOOK: BookPayload = {
  title: 'El Aleph',
  authors: ['Jorge Luis Borges'],
  synopsis: 'Cuentos fantásticos.',
  category: ['Ficción'],
  language: 'Español',
  year: '1949',
  numberPages: '150',
  format: 'PDF',
  image: {},
};

function attachBook(req: request.Test, data: BookPayload = VALID_BOOK) {
  return req
    .field('bookData', JSON.stringify(data))
    .attach('image', Buffer.from('fake-image-bytes'), 'cover.jpg');
}

describe('POST /api/books', () => {
  const ownerCookie = mockSession({ uid: 'owner-1' });

  beforeEach(() => {
    mockSession({ uid: 'owner-1' });
  });

  it('crea el libro y devuelve 201', async () => {
    const res = await attachBook(request(app).post('/api/books').set('Cookie', ownerCookie));
    expect(res.status).toBe(201);
    expect(res.body.title).toBe(VALID_BOOK.title);
    const saved = await booksModel.findOne({ title: VALID_BOOK.title }).lean();
    expect(saved?.userId).toBe('owner-1');
  });

  it('fuerza userId al del token (ignora el que mande el cliente)', async () => {
    const res = await attachBook(request(app).post('/api/books').set('Cookie', ownerCookie), {
      ...VALID_BOOK,
      userId: 'attacker-uid',
    });
    expect(res.status).toBe(201);
    expect(res.body.userId).toBe('owner-1');
  });

  it('rechaza 401 sin sesión', async () => {
    clearSession();
    const res = await attachBook(request(app).post('/api/books'));
    expect(res.status).toBe(401);
  });

  it('rechaza 400 con payload inválido (title vacío)', async () => {
    const res = await attachBook(request(app).post('/api/books').set('Cookie', ownerCookie), {
      ...VALID_BOOK,
      title: '',
    });
    expect(res.status).toBe(400);
  });

  it('rechaza 400 con year fuera de rango', async () => {
    const res = await attachBook(request(app).post('/api/books').set('Cookie', ownerCookie), {
      ...VALID_BOOK,
      year: '1500',
    });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/books/:id', () => {
  it('actualiza el libro cuando el usuario es owner', async () => {
    const cookie = mockSession({ uid: 'owner-2' });
    const book = await seedBook({
      title: 'Original',
      userId: 'owner-2',
      pathUrl: 'original-abcd',
    });

    const res = await request(app)
      .patch(`/api/books/${book.id}`)
      .set('Cookie', cookie)
      .field('bookData', JSON.stringify({ ...VALID_BOOK, title: 'Nuevo título' }));

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Nuevo título');
  });

  it('devuelve 403 cuando otro usuario intenta editar', async () => {
    const book = await seedBook({
      title: 'Ajeno',
      userId: 'owner-3',
      pathUrl: 'ajeno-abcd',
    });

    const cookie = mockSession({ uid: 'someone-else' });
    const res = await request(app)
      .patch(`/api/books/${book.id}`)
      .set('Cookie', cookie)
      .field('bookData', JSON.stringify({ ...VALID_BOOK, title: 'Hack' }));

    expect(res.status).toBe(403);
  });

  it('devuelve 404 cuando el libro no existe', async () => {
    const cookie = mockSession({ uid: 'owner-4' });
    const res = await request(app)
      .patch('/api/books/64abcdef1234567890abcdef')
      .set('Cookie', cookie)
      .field('bookData', JSON.stringify(VALID_BOOK));
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/books/:id', () => {
  it('elimina el libro y cascadea a todas las colecciones dependientes', async () => {
    const cookie = mockSession({ uid: 'owner-5' });
    const book = await seedBook({
      title: 'Para borrar',
      userId: 'owner-5',
      pathUrl: 'para-borrar-abcd',
    });
    const bookId = book.id;
    const otherBookId = new Types.ObjectId();

    // Datos que apuntan al libro a borrar
    await commentsModel.create({
      text: 'comentario',
      bookId,
      author: { userId: 'reader-1', name: 'R', username: 'r', avatar: '' },
    });
    await bookRatingsModel.create({ userId: 'reader-1', bookId, rating: 4 });
    await bookProgressModel.create({
      userId: 'reader-1',
      bookId,
      position: 42,
      type: 'pdf',
    });
    await bookStatusesModel.create({
      userId: 'reader-1',
      bookId,
      status: 'reading',
    });
    await activityLogModel.create({
      userId: 'reader-1',
      type: 'favorite',
      bookId,
    });
    await notificationsModel.create({
      userId: 'reader-1',
      type: 'rating',
      actorId: 'reader-2',
      bookId,
      rating: 4,
    });
    await reportsModel.create({
      bookId,
      reporterId: 'reader-2',
      type: 'spam',
      contactEmail: 'x@y.com',
    });
    // Fav y colección con el libro a borrar + otro libro que debe sobrevivir
    await favoritesModel.create({
      userId: 'reader-1',
      favoriteBooks: [book._id, otherBookId],
    });
    await collectionsModel.create({
      userId: 'reader-1',
      collections: [
        {
          name: 'Mi lista',
          books: [{ bookId: book._id }, { bookId: otherBookId }],
        },
      ],
    });

    const res = await request(app).delete(`/api/books/${bookId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);

    // El libro y todo lo dependiente del bookId desaparecen
    expect(await booksModel.findById(bookId).lean()).toBeNull();
    expect(await commentsModel.findOne({ bookId }).lean()).toBeNull();
    expect(await bookRatingsModel.findOne({ bookId }).lean()).toBeNull();
    expect(await bookProgressModel.findOne({ bookId }).lean()).toBeNull();
    expect(await bookStatusesModel.findOne({ bookId }).lean()).toBeNull();
    expect(await activityLogModel.findOne({ bookId }).lean()).toBeNull();
    expect(await notificationsModel.findOne({ bookId }).lean()).toBeNull();
    expect(await reportsModel.findOne({ bookId }).lean()).toBeNull();

    // Las referencias en arrays de otros docs se limpian, sin destruir el doc
    const fav = await favoritesModel.findOne({ userId: 'reader-1' }).lean();
    expect(fav?.favoriteBooks?.map(String)).not.toContain(bookId);
    expect(fav?.favoriteBooks?.map(String)).toContain(otherBookId.toString());

    const col = await collectionsModel.findOne({ userId: 'reader-1' }).lean();
    const books = (col?.collections?.[0] as any)?.books ?? [];
    expect(books.map((b: any) => String(b.bookId))).not.toContain(bookId);
    expect(books.map((b: any) => String(b.bookId))).toContain(otherBookId.toString());
  });

  it('devuelve 403 cuando otro usuario intenta borrar', async () => {
    const book = await seedBook({
      title: 'Ajeno',
      userId: 'owner-6',
      pathUrl: 'ajeno-borrar-abcd',
    });

    const cookie = mockSession({ uid: 'not-the-owner' });
    const res = await request(app).delete(`/api/books/${book.id}`).set('Cookie', cookie);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/books', () => {
  beforeEach(async () => {
    for (let i = 0; i < 12; i++) {
      await seedBook({
        title: `Libro ${i}`,
        pathUrl: `libro-${i}-xxxx`,
      });
    }
  });

  it('modo cursor: primera página incluye totalBooks y nextCursor', async () => {
    const res = await request(app).get('/api/books?limit=5');
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(5);
    expect(res.body.info.totalBooks).toBe(12);
    expect(res.body.info.nextCursor).toBeTruthy();
    expect(res.body.info.nextUrl).toContain('cursor=');
  });

  it('modo cursor: paginación completa devuelve todos los libros sin duplicar', async () => {
    const collected: string[] = [];
    let cursor: string | null = null;
    let guard = 0;
    do {
      const res: request.Response = await request(app).get(
        `/api/books?limit=5${cursor ? `&cursor=${cursor}` : ''}`
      );
      collected.push(...res.body.results.map((b: { id: string }) => b.id));
      cursor = res.body.info.nextCursor;
      guard++;
    } while (cursor && guard < 10);

    expect(collected).toHaveLength(12);
    expect(new Set(collected).size).toBe(12);
  });

  it('modo page: devuelve totalPages y nextPage correctos', async () => {
    const res = await request(app).get('/api/books?page=1&limit=5');
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(5);
    expect(res.body.info.total).toBe(12);
    expect(res.body.info.totalPages).toBe(3);
    expect(res.body.info.currentPage).toBe(1);
    expect(res.body.info.nextPage).toBe(2);
    expect(res.body.info.prevPage).toBeNull();
  });

  it('modo page: última página tiene nextPage null', async () => {
    const res = await request(app).get('/api/books?page=3&limit=5');
    expect(res.body.info.nextPage).toBeNull();
    expect(res.body.info.prevPage).toBe(2);
    expect(res.body.results).toHaveLength(2); // 12 - 10 = 2
  });
});

describe('GET /api/books/filter — cursor + counts', () => {
  // Endpoint dedicado a filtros. Devuelve `info.{nextCursor, nextUrl}` +
  // `info.{totalBooks, *Counts}` solo en la 1ra página. `/api/books` queda
  // reservado para el listado plano (cursor/page mode).
  beforeEach(async () => {
    await seedBook({
      title: 'Ficción 1',
      category: ['Ficción'],
      language: 'Español',
      year: 2020,
      authors: ['Autor A'],
      pathUrl: 'ficcion-1',
    });
    await seedBook({
      title: 'Ficción 2',
      category: ['Ficción'],
      language: 'Español',
      year: 2021,
      authors: ['Autor B'],
      pathUrl: 'ficcion-2',
    });
    await seedBook({
      title: 'Historia 1',
      category: ['Historia'],
      language: 'Inglés',
      year: 2020,
      authors: ['Autor A'],
      pathUrl: 'historia-1',
    });
  });

  it('?category=Ficción devuelve solo los libros de esa categoría', async () => {
    const res = await request(app).get('/api/books/filter?category=Ficci%C3%B3n&limit=10');
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(2);
    expect(res.body.results.every((b: { title: string }) => b.title.startsWith('Ficción'))).toBe(
      true
    );
  });

  it('1ra página incluye totalBooks y *Counts para armar el sidebar', async () => {
    const res = await request(app).get('/api/books/filter?category=Ficci%C3%B3n&limit=10');
    expect(res.status).toBe(200);
    expect(res.body.info.totalBooks).toBe(2);
    // Sidebar de idiomas: los 2 libros filtrados son en Español
    expect(res.body.info.languageCounts).toEqual(
      expect.arrayContaining([expect.objectContaining({ language: 'Español', count: 2 })])
    );
    const years = res.body.info.yearCounts.map((y: { year: number }) => y.year).sort();
    expect(years).toEqual([2020, 2021]);
    // Autores se normalizan a lowercase en la agregación
    const authors = res.body.info.authorsCounts.map((a: { authors: string }) => a.authors).sort();
    expect(authors).toEqual(['autor a', 'autor b']);
  });

  it('páginas siguientes (con cursor) NO incluyen counts, solo results + cursor', async () => {
    // Seedeamos suficientes libros de Ficción para tener 2ra página
    for (let i = 0; i < 10; i++) {
      await seedBook({
        title: `Extra ${i}`,
        category: ['Ficción'],
        language: 'Español',
        year: 2022,
        authors: ['Extra'],
        pathUrl: `extra-${i}`,
      });
    }
    const first = await request(app).get('/api/books/filter?category=Ficci%C3%B3n&limit=5');
    expect(first.body.info.nextCursor).toBeTruthy();
    expect(first.body.info.totalBooks).toBe(12);
    expect(first.body.info.languageCounts).toBeTruthy();

    const cursor = first.body.info.nextCursor as string;
    const second = await request(app).get(
      `/api/books/filter?category=Ficci%C3%B3n&limit=5&cursor=${cursor}`
    );
    expect(second.status).toBe(200);
    expect(second.body.results.length).toBeGreaterThan(0);
    // Counts solo en la 1ra
    expect(second.body.info.totalBooks).toBeUndefined();
    expect(second.body.info.languageCounts).toBeUndefined();
    expect(second.body.info.yearCounts).toBeUndefined();
  });

  it('?language=Español filtra por idioma (case-insensitive)', async () => {
    const res = await request(app).get('/api/books/filter?language=espa%C3%B1ol&limit=10');
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(2);
    expect(res.body.results.every((b: { language: string }) => b.language === 'Español')).toBe(
      true
    );
  });

  it('?year=2020 filtra por año', async () => {
    const res = await request(app).get('/api/books/filter?year=2020&limit=10');
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(2);
  });

  it('?authors= filtra por autor con regex (parcial + case-insensitive)', async () => {
    const res = await request(app).get('/api/books/filter?authors=autor%20a&limit=10');
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(2);
    const titles = res.body.results.map((b: { title: string }) => b.title).sort();
    expect(titles).toEqual(['Ficción 1', 'Historia 1']);
  });

  it('combinar filtros: ?category=Ficción&year=2020 estrecha el resultado', async () => {
    const res = await request(app).get(
      '/api/books/filter?category=Ficci%C3%B3n&year=2020&limit=10'
    );
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].title).toBe('Ficción 1');
  });

  it('sin filtros devuelve 400', async () => {
    const res = await request(app).get('/api/books/filter?limit=10');
    expect(res.status).toBe(400);
  });

  it('filtro sin matches devuelve 404', async () => {
    const res = await request(app).get('/api/books/filter?category=NoExiste&limit=10');
    expect(res.status).toBe(404);
  });

  it('/api/books (sin filtros) NO devuelve *Counts — es endpoint plano', async () => {
    const res = await request(app).get('/api/books?limit=10');
    expect(res.status).toBe(200);
    expect(res.body.info.languageCounts).toBeUndefined();
    expect(res.body.info.yearCounts).toBeUndefined();
    expect(res.body.info.authorsCounts).toBeUndefined();
  });
});

describe('GET /api/books/filter — facet counts dinámicos', () => {
  // Cada dimensión de facet se recalcula sobre los OTROS filtros, pero NO
  // sobre sí misma. Marcar "Español" no colapsa la lista de idiomas, pero sí
  // recalcula años/autores/páginas sobre libros en Español.
  beforeEach(async () => {
    // Fixture: 6 libros de categoría Ficción con combinaciones variadas
    // en idioma, año y autor.
    await seedBook({
      title: 'A',
      category: ['Ficción'],
      language: 'Español',
      year: 2020,
      authors: ['Autor A'],
      pathUrl: 'a',
      numberPages: 100,
    });
    await seedBook({
      title: 'B',
      category: ['Ficción'],
      language: 'Español',
      year: 2021,
      authors: ['Autor B'],
      pathUrl: 'b',
      numberPages: 200,
    });
    await seedBook({
      title: 'C',
      category: ['Ficción'],
      language: 'Español',
      year: 2020,
      authors: ['Autor A'],
      pathUrl: 'c',
      numberPages: 150,
    });
    await seedBook({
      title: 'D',
      category: ['Ficción'],
      language: 'Inglés',
      year: 2020,
      authors: ['Autor C'],
      pathUrl: 'd',
      numberPages: 300,
    });
    await seedBook({
      title: 'E',
      category: ['Ficción'],
      language: 'Inglés',
      year: 2022,
      authors: ['Autor A'],
      pathUrl: 'e',
      numberPages: 400,
    });
    await seedBook({
      title: 'F',
      category: ['Ficción'],
      language: 'Francés',
      year: 2021,
      authors: ['Autor D'],
      pathUrl: 'f',
      numberPages: 250,
    });
  });

  it('sin sub-filtros los counts son los totales del filtro principal', async () => {
    const res = await request(app).get('/api/books/filter?category=Ficci%C3%B3n&limit=10');
    expect(res.status).toBe(200);
    expect(res.body.info.totalBooks).toBe(6);
    // Los 3 idiomas presentes con sus counts totales
    const langs = res.body.info.languageCounts.reduce(
      (acc: Record<string, number>, l: { language: string; count: number }) => {
        acc[l.language] = l.count;
        return acc;
      },
      {}
    );
    expect(langs).toEqual({ Español: 3, Inglés: 2, Francés: 1 });
  });

  it('marcar languages=Español recalcula yearCounts y authorsCounts, no languageCounts', async () => {
    const res = await request(app).get(
      '/api/books/filter?category=Ficci%C3%B3n&languages=Espa%C3%B1ol&limit=10'
    );
    expect(res.status).toBe(200);

    // languageCounts: mantiene todos los idiomas (dimensión propia, no se auto-colapsa)
    const langs = res.body.info.languageCounts.map((l: { language: string }) => l.language).sort();
    expect(langs).toEqual(['Español', 'Francés', 'Inglés']);

    // yearCounts: solo años que existen en libros en Español (2020, 2021 — NO 2022 ni el año-de-Francés)
    const years = res.body.info.yearCounts.map((y: { year: number }) => y.year).sort();
    expect(years).toEqual([2020, 2021]);

    // authorsCounts: solo autores con libros en Español (A y B — no C, D)
    const authors = res.body.info.authorsCounts.map((a: { authors: string }) => a.authors).sort();
    expect(authors).toEqual(['autor a', 'autor b']);
  });

  it('marcar dos idiomas (OR) recalcula sobre la unión', async () => {
    const res = await request(app).get(
      '/api/books/filter?category=Ficci%C3%B3n&languages=Espa%C3%B1ol,Ingl%C3%A9s&limit=10'
    );
    expect(res.status).toBe(200);

    // Años presentes en Español OR Inglés: 2020, 2021, 2022 (no 2021-de-Francés — pero 2021 ya está por Español)
    const years = res.body.info.yearCounts.map((y: { year: number }) => y.year).sort();
    expect(years).toEqual([2020, 2021, 2022]);

    // results filtrados por languages=Español,Inglés (5 libros, F queda afuera)
    expect(res.body.info.totalBooks).toBe(5);
  });

  it('marcar years recalcula languageCounts y authorsCounts', async () => {
    const res = await request(app).get(
      '/api/books/filter?category=Ficci%C3%B3n&years=2020&limit=10'
    );
    expect(res.status).toBe(200);

    // yearCounts: mantiene TODOS los años (dimensión propia)
    const years = res.body.info.yearCounts.map((y: { year: number }) => y.year).sort();
    expect(years).toEqual([2020, 2021, 2022]);

    // languageCounts: solo los idiomas de 2020 (Español, Inglés — no Francés que es 2021)
    const langs = res.body.info.languageCounts.map((l: { language: string }) => l.language).sort();
    expect(langs).toEqual(['Español', 'Inglés']);

    // authorsCounts: solo autores con libros en 2020 (A y C — no B, D)
    const authors = res.body.info.authorsCounts.map((a: { authors: string }) => a.authors).sort();
    expect(authors).toEqual(['autor a', 'autor c']);
  });

  it('combinar sub-filtros: languages=Español + years=2020 estrecha results', async () => {
    const res = await request(app).get(
      '/api/books/filter?category=Ficci%C3%B3n&languages=Espa%C3%B1ol&years=2020&limit=10'
    );
    expect(res.status).toBe(200);

    // Libros que matchean: A y C
    expect(res.body.info.totalBooks).toBe(2);
    const titles = res.body.results.map((b: { title: string }) => b.title).sort();
    expect(titles).toEqual(['A', 'C']);

    // languageCounts: se recalcula EXCLUYENDO languages (o sea aplicando solo years=2020)
    const langs = res.body.info.languageCounts.map((l: { language: string }) => l.language).sort();
    expect(langs).toEqual(['Español', 'Inglés']);

    // yearCounts: se recalcula EXCLUYENDO years (o sea aplicando solo languages=Español)
    const years = res.body.info.yearCounts.map((y: { year: number }) => y.year).sort();
    expect(years).toEqual([2020, 2021]);
  });

  it('range de páginas: minPages=200&maxPages=300 filtra correctamente', async () => {
    const res = await request(app).get(
      '/api/books/filter?category=Ficci%C3%B3n&minPages=200&maxPages=300&limit=10'
    );
    expect(res.status).toBe(200);
    // B=200, D=300, F=250 → 3 libros
    expect(res.body.info.totalBooks).toBe(3);
    const titles = res.body.results.map((b: { title: string }) => b.title).sort();
    expect(titles).toEqual(['B', 'D', 'F']);
  });
});
