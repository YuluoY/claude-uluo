/** The availability status of a book copy in the library. */
export enum BookStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  ON_LOAN = 'ON_LOAN',
  UNDER_MAINTENANCE = 'UNDER_MAINTENANCE',
}

/** Categories a book can belong to. */
export enum BookCategory {
  FICTION = 'FICTION',
  NON_FICTION = 'NON_FICTION',
  SCIENCE = 'SCIENCE',
  TECHNOLOGY = 'TECHNOLOGY',
  HISTORY = 'HISTORY',
  BIOGRAPHY = 'BIOGRAPHY',
  ART = 'ART',
  PHILOSOPHY = 'PHILOSOPHY',
  CHILDREN = 'CHILDREN',
  REFERENCE = 'REFERENCE',
}

/** Represents a physical or digital book in the library catalog. */
export interface Book {
  /** Unique identifier for the book (ISBN-13). */
  isbn: string;
  /** Title of the book. */
  title: string;
  /** Author(s) of the book. */
  author: string;
  /** Publication year. */
  publicationYear: number;
  /** Publisher name. */
  publisher: string;
  /** Book category. */
  category: BookCategory;
  /** Short description or summary. */
  description: string;
  /** Total number of copies the library owns. */
  totalCopies: number;
  /** Number of copies currently available for reservation. */
  availableCopies: number;
  /** Cover image URL (optional). */
  coverImageUrl?: string;
  /** Language of the book. */
  language: string;
  /** Tags / keywords for enhanced searching. */
  tags: string[];
}

/** A simplified book view returned in search results. */
export interface BookSearchResult {
  isbn: string;
  title: string;
  author: string;
  category: BookCategory;
  publicationYear: number;
  availableCopies: number;
  coverImageUrl?: string;
  tags: string[];
}

/** Parameters for searching books. */
export interface BookSearchParams {
  query?: string;
  author?: string;
  category?: BookCategory;
  publicationYearFrom?: number;
  publicationYearTo?: number;
  language?: string;
  availableOnly?: boolean;
  tags?: string[];
  /** Page number (1-based). */
  page?: number;
  /** Results per page. */
  pageSize?: number;
  /** Field to sort by. */
  sortBy?: 'title' | 'author' | 'publicationYear' | 'availableCopies';
  /** Sort direction. */
  sortOrder?: 'asc' | 'desc';
}

/** Paginated response wrapper. */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
