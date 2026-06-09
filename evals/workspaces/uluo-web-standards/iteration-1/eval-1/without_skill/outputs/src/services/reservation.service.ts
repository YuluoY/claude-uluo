import { v4 as uuidv4 } from 'uuid';
import { getBookByIsbn, decrementAvailableCopies, incrementAvailableCopies } from '../data/books';
import {
  getActiveReservationsByUser,
  getActiveReservationsByBook,
  insertReservation,
  getReservationById,
  updateReservationStatus,
} from '../data/reservations';
import {
  Reservation,
  ReservationStatus,
  CreateReservationInput,
  CancelReservationInput,
} from '../types/reservation';
import {
  NotFoundError,
  ConflictError,
  BusinessRuleViolationError,
  ValidationError,
} from '../utils/errors';
import { Logger } from '../utils/logger';

const reservationLogger = new Logger('ReservationService');

/** Default maximum reservations per user. */
const DEFAULT_MAX_RESERVATIONS = 5;

/** Default pickup window in hours. */
const DEFAULT_PICKUP_HOURS = 72;

/**
 * Reservation service: handles the core business logic for
 * creating and cancelling book reservations.
 */
export class ReservationService {
  private maxReservationsPerUser: number;
  private pickupWindowHours: number;

  constructor(maxReservationsPerUser = DEFAULT_MAX_RESERVATIONS, pickupWindowHours = DEFAULT_PICKUP_HOURS) {
    this.maxReservationsPerUser = maxReservationsPerUser;
    this.pickupWindowHours = pickupWindowHours;
  }

  /**
   * Create a new reservation for a user on a specific book.
   *
   * Business rules:
   * 1. The book must exist in the catalog.
   * 2. The book must have at least one available copy.
   * 3. The user must not have already reserved this same book actively.
   * 4. The user must not exceed their maximum concurrent reservations.
   */
  reserve(input: CreateReservationInput): Reservation {
    const { bookIsbn, userId, notes } = input;

    reservationLogger.info('Creating reservation', { bookIsbn, userId });

    // 1. Validate the book exists.
    const book = getBookByIsbn(bookIsbn);
    if (!book) {
      throw new NotFoundError('Book', bookIsbn);
    }

    // 2. Check availability.
    if (book.availableCopies <= 0) {
      throw new ConflictError(
        `No copies of "${book.title}" are currently available for reservation.`,
      );
    }

    // 3. Check for duplicate reservation by the same user on the same book.
    const userActiveOnBook = getActiveReservationsByBook(bookIsbn).filter(
      (r) => r.userId === userId,
    );
    if (userActiveOnBook.length > 0) {
      throw new ConflictError(
        `You already have an active reservation for "${book.title}".`,
      );
    }

    // 4. Check user's max reservation limit.
    const userActiveReservations = getActiveReservationsByUser(userId);
    if (userActiveReservations.length >= this.maxReservationsPerUser) {
      throw new BusinessRuleViolationError(
        `You have reached the maximum of ${this.maxReservationsPerUser} active reservations. ` +
        'Please cancel an existing reservation before making a new one.',
      );
    }

    // 5. Decrement available copies.
    decrementAvailableCopies(bookIsbn);

    // 6. Create the reservation.
    const now = new Date();
    const pickupDeadline = new Date(
      now.getTime() + this.pickupWindowHours * 60 * 60 * 1000,
    );

    const reservation: Reservation = {
      id: uuidv4(),
      bookIsbn,
      userId,
      status: ReservationStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
      pickupDeadline,
      notes,
    };

    insertReservation(reservation);

    reservationLogger.info('Reservation created', {
      reservationId: reservation.id,
      bookIsbn,
      userId,
    });

    return reservation;
  }

  /**
   * Cancel an existing reservation.
   *
   * Business rules:
   * 1. The reservation must exist.
   * 2. The reservation must belong to the requesting user.
   * 3. Only ACTIVE reservations can be cancelled.
   */
  cancel(input: CancelReservationInput): Reservation {
    const { reservationId, userId } = input;

    reservationLogger.info('Cancelling reservation', { reservationId, userId });

    // 1. Validate reservation exists.
    const reservation = getReservationById(reservationId);
    if (!reservation) {
      throw new NotFoundError('Reservation', reservationId);
    }

    // 2. Ownership check.
    if (reservation.userId !== userId) {
      throw new BusinessRuleViolationError(
        'You can only cancel your own reservations.',
      );
    }

    // 3. State check.
    if (reservation.status !== ReservationStatus.ACTIVE) {
      throw new ConflictError(
        `Cannot cancel a reservation with status "${reservation.status}". ` +
        'Only ACTIVE reservations can be cancelled.',
      );
    }

    // 4. Update status.
    updateReservationStatus(reservationId, ReservationStatus.CANCELLED);

    // 5. Return the copy to the available pool.
    incrementAvailableCopies(reservation.bookIsbn);

    const updated = getReservationById(reservationId)!;

    reservationLogger.info('Reservation cancelled', {
      reservationId,
      bookIsbn: updated.bookIsbn,
      userId,
    });

    return updated;
  }

  /**
   * Get a reservation by ID.
   */
  getReservation(reservationId: string): Reservation {
    const reservation = getReservationById(reservationId);
    if (!reservation) {
      throw new NotFoundError('Reservation', reservationId);
    }
    return reservation;
  }

  /**
   * List all active reservations for a given user.
   */
  getUserReservations(userId: string): Reservation[] {
    return getActiveReservationsByUser(userId);
  }

  /**
   * Check if a specific book is currently available for reservation.
   */
  isBookAvailable(isbn: string): { available: boolean; bookTitle?: string; availableCopies?: number } {
    const book = getBookByIsbn(isbn);
    if (!book) {
      throw new NotFoundError('Book', isbn);
    }
    return {
      available: book.availableCopies > 0,
      bookTitle: book.title,
      availableCopies: book.availableCopies,
    };
  }
}

/** Singleton instance with default settings. */
export const reservationService = new ReservationService();
