import { getAllBooks } from '../data/books';
import {
  BookSearchParams,
  BookSearchResult,
  PaginatedResult,
} from '../types/book';
import { logger } from '../utils/logger';

const searchLogger = logger;

/**
 * Maps a full Book to a lighter BookSearchResult.
 */
function toSearchResult(book: ReturnType<typeof getAllBooks>[number]): BookSearchResult {
  return {
    isbn: book.isbn,
    title: book.title,
    author: book.author,
    category: book.category,
    publicationYear: book.publicationYear,
    availableCopies: book.availableCopies,
    coverImageUrl: book.coverImageUrl,
    tags: book.tags,
  };
}

/**
 * Search service: filters and paginates the book catalog.
 *
 * Supports:
 * - Full-text search across title, author, description, and tags
 * - Filter by author, category, publication year range, language
 * - Filter for available-only books
 * - Pagination and sorting
 */
export class SearchService {
  /**
   * Search books by the given parameters.
   */
  search(params: BookSearchParams): PaginatedResult<BookSearchResult> {
    const {
      query,
      author,
      category,
      publicationYearFrom,
      publicationYearTo,
      language,
      availableOnly = false,
      tags,
      page = 1,
      pageSize = 10,
      sortBy = 'title',
      sortOrder = 'asc',
    } = params;

    searchLogger.info('Executing book search', { ...params });

    let results = getAllBooks();

    // --- Filters ---

    // Full-text search across multiple fields.
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(
        (b) =>
          b.title.toLowerCase().includes(lowerQuery) ||
          b.author.toLowerCase().includes(lowerQuery) ||
          b.description.toLowerCase().includes(lowerQuery) ||
          b.tags.some((t) => t.toLowerCase().includes(lowerQuery)),
      );
    }

    // Exact author filter.
    if (author) {
      const lowerAuthor = author.toLowerCase();
      results = results.filter((b) =>
        b.author.toLowerCase().includes(lowerAuthor),
      );
    }

    // Category filter.
    if (category) {
      results = results.filter((b) => b.category === category);
    }

    // Publication year range.
    if (publicationYearFrom !== undefined) {
      results = results.filter((b) => b.publicationYear >= publicationYearFrom);
    }
    if (publicationYearTo !== undefined) {
      results = results.filter((b) => b.publicationYear <= publicationYearTo);
    }

    // Language filter.
    if (language) {
      results = results.filter(
        (b) => b.language.toLowerCase() === language.toLowerCase(),
      );
    }

    // Available only.
    if (availableOnly) {
      results = results.filter((b) => b.availableCopies > 0);
    }

    // Tags filter (match all specified tags).
    if (tags && tags.length > 0) {
      const lowerTags = tags.map((t) => t.toLowerCase());
      results = results.filter((b) =>
        lowerTags.every((lt) =>
          b.tags.some((bt) => bt.toLowerCase() === lt),
        ),
      );
    }

    // --- Sorting ---
    results.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'author':
          comparison = a.author.localeCompare(b.author);
          break;
        case 'publicationYear':
          comparison = a.publicationYear - b.publicationYear;
          break;
        case 'availableCopies':
          comparison = a.availableCopies - b.availableCopies;
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // --- Pagination ---
    const total = results.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const pagedResults = results.slice(start, start + pageSize);

    const items = pagedResults.map(toSearchResult);

    searchLogger.info('Search completed', { total, page: safePage, pageSize });

    return {
      items,
      total,
      page: safePage,
      pageSize,
      totalPages,
    };
  }

  /**
   * Get a single book's full details by ISBN.
   */
  getBookByIsbn(isbn: string): BookSearchResult | null {
    const all = getAllBooks();
    const book = all.find((b) => b.isbn === isbn);
    return book ? toSearchResult(book) : null;
  }
}

/** Singleton instance. */
export const searchService = new SearchService();
