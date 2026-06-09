import { SearchService } from '../src/services/search.service';
import { BookCategory } from '../src/types/book';

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    service = new SearchService();
  });

  describe('search', () => {
    it('should return all books when no filters are provided', () => {
      const result = service.search({});
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThanOrEqual(result.items.length);
      expect(result.page).toBe(1);
    });

    it('should filter books by query (case-insensitive title match)', () => {
      const result = service.search({ query: 'typescript' });
      expect(result.items.every((b) =>
        b.title.toLowerCase().includes('typescript') ||
        b.author.toLowerCase().includes('typescript') ||
        b.tags.some((t) => t.toLowerCase().includes('typescript'))
      )).toBe(true);
    });

    it('should filter books by author', () => {
      const result = service.search({ author: 'Orwell' });
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.every((b) =>
        b.author.toLowerCase().includes('orwell')
      )).toBe(true);
    });

    it('should filter books by category', () => {
      const result = service.search({ category: BookCategory.FICTION });
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.every((b) => b.category === BookCategory.FICTION)).toBe(true);
    });

    it('should filter books by publication year range', () => {
      const result = service.search({
        publicationYearFrom: 2000,
        publicationYearTo: 2020,
      });
      expect(result.items.every(
        (b) => b.publicationYear >= 2000 && b.publicationYear <= 2020,
      )).toBe(true);
    });

    it('should filter to available-only books', () => {
      const result = service.search({ availableOnly: true });
      expect(result.items.every((b) => b.availableCopies > 0)).toBe(true);
    });

    it('should paginate results', () => {
      const result = service.search({ page: 1, pageSize: 3 });
      expect(result.items.length).toBeLessThanOrEqual(3);
      expect(result.pageSize).toBe(3);
      expect(result.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('should sort results by title ascending by default', () => {
      const result = service.search({});
      const titles = result.items.map((b) => b.title);
      const sorted = [...titles].sort((a, b) => a.localeCompare(b));
      expect(titles).toEqual(sorted);
    });

    it('should sort results by publicationYear descending', () => {
      const result = service.search({ sortBy: 'publicationYear', sortOrder: 'desc' });
      const years = result.items.map((b) => b.publicationYear);
      for (let i = 1; i < years.length; i++) {
        expect(years[i]).toBeLessThanOrEqual(years[i - 1]);
      }
    });

    it('should filter by tags (match all specified tags)', () => {
      const result = service.search({ tags: ['fiction', 'classic'] });
      expect(result.items.every((b) =>
        b.tags.some((t) => t === 'fiction') &&
        b.tags.some((t) => t === 'classic')
      )).toBe(true);
    });
  });

  describe('getBookByIsbn', () => {
    it('should return a book for a valid ISBN', () => {
      const book = service.getBookByIsbn('978-0-201-63361-0');
      expect(book).not.toBeNull();
      expect(book!.title).toContain('Design Patterns');
    });

    it('should return null for an invalid ISBN', () => {
      const book = service.getBookByIsbn('000-0-000-00000-0');
      expect(book).toBeNull();
    });
  });
});
