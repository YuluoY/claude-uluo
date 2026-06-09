import { Request, Response, NextFunction } from 'express';
import { searchService } from '../services/search.service';
import { BookCategory, BookSearchParams } from '../types/book';
import { NotFoundError } from '../utils/errors';

/**
 * Controller handling book search HTTP requests.
 */
export class SearchController {
  /**
   * GET /api/books/search
   * Query parameters: query, author, category, publicationYearFrom,
   *   publicationYearTo, language, availableOnly, tags, page, pageSize,
   *   sortBy, sortOrder
   */
  search(req: Request, res: Response, next: NextFunction): void {
    try {
      const {
        query,
        author,
        category,
        publicationYearFrom,
        publicationYearTo,
        language,
        availableOnly,
        tags,
        page,
        pageSize,
        sortBy,
        sortOrder,
      } = req.query;

      const params: BookSearchParams = {
        query: query as string | undefined,
        author: author as string | undefined,
        category: category
          ? (category as BookCategory)
          : undefined,
        publicationYearFrom: publicationYearFrom
          ? Number(publicationYearFrom)
          : undefined,
        publicationYearTo: publicationYearTo
          ? Number(publicationYearTo)
          : undefined,
        language: language as string | undefined,
        availableOnly: availableOnly === 'true',
        tags: tags ? (tags as string).split(',') : undefined,
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
        sortBy: sortBy as BookSearchParams['sortBy'] | undefined,
        sortOrder: sortOrder as BookSearchParams['sortOrder'] | undefined,
      };

      const result = searchService.search(params);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/books/:isbn
   * Retrieve a single book by its ISBN.
   */
  getBook(req: Request, res: Response, next: NextFunction): void {
    try {
      const { isbn } = req.params;
      const book = searchService.getBookByIsbn(isbn);
      if (!book) {
        throw new NotFoundError('Book', isbn);
      }
      res.json(book);
    } catch (err) {
      next(err);
    }
  }
}

export const searchController = new SearchController();
