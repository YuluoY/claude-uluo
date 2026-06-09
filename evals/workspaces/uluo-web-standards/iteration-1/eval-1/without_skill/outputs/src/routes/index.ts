import { Router } from 'express';
import { searchController } from '../controllers/search.controller';
import { reservationController } from '../controllers/reservation.controller';
import { validate } from '../middleware/validator';

const router = Router();

// ─── Book Search ────────────────────────────────────────────────

/** Search books with filters and pagination. */
router.get('/api/books/search', searchController.search.bind(searchController));

/** Get a single book by ISBN. */
router.get('/api/books/:isbn', searchController.getBook.bind(searchController));

/** Check if a book is available for reservation. */
router.get(
  '/api/books/:isbn/availability',
  reservationController.checkAvailability.bind(reservationController),
);

// ─── Reservations ───────────────────────────────────────────────

/** Create a new reservation. */
router.post(
  '/api/reservations',
  validate([
    { field: 'bookIsbn', type: 'string', required: true },
    { field: 'userId', type: 'string', required: true },
  ]),
  reservationController.create.bind(reservationController),
);

/** Cancel a reservation. */
router.post(
  '/api/reservations/:id/cancel',
  validate([
    { field: 'userId', type: 'string', required: true },
  ]),
  reservationController.cancel.bind(reservationController),
);

/** Get a reservation by ID. */
router.get(
  '/api/reservations/:id',
  reservationController.getById.bind(reservationController),
);

/** List all active reservations for a user. */
router.get(
  '/api/users/:userId/reservations',
  reservationController.getUserReservations.bind(reservationController),
);

export default router;
