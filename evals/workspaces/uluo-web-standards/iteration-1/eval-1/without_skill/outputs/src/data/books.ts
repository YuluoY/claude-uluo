import { Book, BookCategory } from '../types/book';

/**
 * In-memory book catalog with seed data.
 * In production this would be backed by a database.
 */
const books: Map<string, Book> = new Map();

/** Seed the in-memory store with sample books. */
function seedBooks(): void {
  const catalog: Book[] = [
    {
      isbn: '978-0-13-468599-1',
      title: 'Clean Architecture',
      author: 'Robert C. Martin',
      publicationYear: 2017,
      publisher: 'Prentice Hall',
      category: BookCategory.TECHNOLOGY,
      description: 'A Craftsman\'s Guide to Software Structure and Design.',
      totalCopies: 5,
      availableCopies: 3,
      language: 'English',
      tags: ['software', 'architecture', 'design', 'best-practices'],
    },
    {
      isbn: '978-0-201-63361-0',
      title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
      author: 'Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides',
      publicationYear: 1994,
      publisher: 'Addison-Wesley',
      category: BookCategory.TECHNOLOGY,
      description: 'The seminal book on software design patterns by the Gang of Four.',
      totalCopies: 4,
      availableCopies: 4,
      language: 'English',
      tags: ['software', 'design-patterns', 'oop', 'architecture'],
    },
    {
      isbn: '978-0-596-51774-8',
      title: 'JavaScript: The Good Parts',
      author: 'Douglas Crockford',
      publicationYear: 2008,
      publisher: 'O\'Reilly Media',
      category: BookCategory.TECHNOLOGY,
      description: 'Unearthing the excellence in JavaScript.',
      totalCopies: 3,
      availableCopies: 0,
      language: 'English',
      tags: ['javascript', 'programming', 'web'],
    },
    {
      isbn: '978-1-491-95038-8',
      title: 'TypeScript Quickly',
      author: 'Yakov Fain, Anton Moiseev',
      publicationYear: 2020,
      publisher: 'Manning Publications',
      category: BookCategory.TECHNOLOGY,
      description: 'A fast-paced guide to TypeScript for JavaScript developers.',
      totalCopies: 3,
      availableCopies: 2,
      language: 'English',
      tags: ['typescript', 'javascript', 'programming'],
    },
    {
      isbn: '978-0-06-112008-4',
      title: 'To Kill a Mockingbird',
      author: 'Harper Lee',
      publicationYear: 1960,
      publisher: 'HarperCollins',
      category: BookCategory.FICTION,
      description: 'A novel about racial injustice in the Deep South.',
      totalCopies: 6,
      availableCopies: 5,
      language: 'English',
      tags: ['fiction', 'classic', 'southern-gothic', 'legal'],
    },
    {
      isbn: '978-0-14-118776-1',
      title: '1984',
      author: 'George Orwell',
      publicationYear: 1949,
      publisher: 'Penguin Books',
      category: BookCategory.FICTION,
      description: 'A dystopian novel set in a totalitarian society.',
      totalCopies: 8,
      availableCopies: 6,
      language: 'English',
      tags: ['fiction', 'dystopian', 'classic', 'political'],
    },
    {
      isbn: '978-0-14-143951-8',
      title: 'Pride and Prejudice',
      author: 'Jane Austen',
      publicationYear: 1813,
      publisher: 'Penguin Classics',
      category: BookCategory.FICTION,
      description: 'A romantic novel of manners.',
      totalCopies: 4,
      availableCopies: 4,
      language: 'English',
      tags: ['fiction', 'romance', 'classic', 'regency'],
    },
    {
      isbn: '978-0-393-08905-9',
      title: 'The Sixth Extinction: An Unnatural History',
      author: 'Elizabeth Kolbert',
      publicationYear: 2014,
      publisher: 'Henry Holt and Company',
      category: BookCategory.SCIENCE,
      description: 'An exploration of the ongoing mass extinction caused by human activity.',
      totalCopies: 2,
      availableCopies: 2,
      language: 'English',
      tags: ['science', 'environment', 'extinction', 'nature'],
    },
    {
      isbn: '978-0-307-58837-1',
      title: 'Sapiens: A Brief History of Humankind',
      author: 'Yuval Noah Harari',
      publicationYear: 2014,
      publisher: 'Harper',
      category: BookCategory.HISTORY,
      description: 'A sweeping history of the human species.',
      totalCopies: 7,
      availableCopies: 5,
      language: 'English',
      tags: ['history', 'anthropology', 'civilization', 'non-fiction'],
    },
    {
      isbn: '978-0-8041-3902-1',
      title: 'Thinking, Fast and Slow',
      author: 'Daniel Kahneman',
      publicationYear: 2011,
      publisher: 'Farrar, Straus and Giroux',
      category: BookCategory.PHILOSOPHY,
      description: 'An exploration of the two systems that drive the way we think.',
      totalCopies: 3,
      availableCopies: 1,
      language: 'English',
      tags: ['psychology', 'decision-making', 'cognitive-science', 'non-fiction'],
    },
    {
      isbn: '978-7-02-000220-7',
      title: '三国演义 (Romance of the Three Kingdoms)',
      author: '罗贯中 (Luo Guanzhong)',
      publicationYear: 1400,
      publisher: '人民文学出版社',
      category: BookCategory.FICTION,
      description: 'One of the four great classical novels of Chinese literature.',
      totalCopies: 3,
      availableCopies: 3,
      language: 'Chinese',
      tags: ['fiction', 'historical', 'classic', 'chinese-literature'],
    },
    {
      isbn: '978-0-385-50420-1',
      title: 'The Da Vinci Code',
      author: 'Dan Brown',
      publicationYear: 2003,
      publisher: 'Doubleday',
      category: BookCategory.FICTION,
      description: 'A mystery thriller that explores religious history and art.',
      totalCopies: 5,
      availableCopies: 5,
      language: 'English',
      tags: ['fiction', 'thriller', 'mystery', 'conspiracy'],
    },
  ];

  for (const book of catalog) {
    books.set(book.isbn, book);
  }
}

// Seed on module load.
seedBooks();

/** Retrieve all books (returns a shallow copy of the values). */
export function getAllBooks(): Book[] {
  return Array.from(books.values());
}

/** Retrieve a single book by ISBN. */
export function getBookByIsbn(isbn: string): Book | undefined {
  return books.get(isbn);
}

/** Decrement the available copies count. Returns the updated book or undefined. */
export function decrementAvailableCopies(isbn: string): Book | undefined {
  const book = books.get(isbn);
  if (book && book.availableCopies > 0) {
    book.availableCopies -= 1;
    return book;
  }
  return undefined;
}

/** Increment the available copies count (on cancellation). */
export function incrementAvailableCopies(isbn: string): Book | undefined {
  const book = books.get(isbn);
  if (book && book.availableCopies < book.totalCopies) {
    book.availableCopies += 1;
    return book;
  }
  return undefined;
}
