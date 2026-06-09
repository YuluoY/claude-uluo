/** The lifecycle states of a reservation. */
export enum ReservationStatus {
  /** Reservation is active and waiting for pickup. */
  ACTIVE = 'ACTIVE',
  /** Book has been picked up / loan started. */
  FULFILLED = 'FULFILLED',
  /** Reservation was cancelled by the user. */
  CANCELLED = 'CANCELLED',
  /** Reservation expired before pickup. */
  EXPIRED = 'EXPIRED',
}

/** Represents a user's reservation of a book. */
export interface Reservation {
  /** Unique reservation identifier. */
  id: string;
  /** ISBN of the reserved book. */
  bookIsbn: string;
  /** ID of the user who made the reservation. */
  userId: string;
  /** Current status of the reservation. */
  status: ReservationStatus;
  /** When the reservation was created. */
  createdAt: Date;
  /** When the reservation was last updated. */
  updatedAt: Date;
  /** Deadline by which the user must pick up the book. */
  pickupDeadline?: Date;
  /** Optional notes from the user. */
  notes?: string;
}

/** Input data for creating a new reservation. */
export interface CreateReservationInput {
  bookIsbn: string;
  userId: string;
  notes?: string;
}

/** Input data for cancelling a reservation. */
export interface CancelReservationInput {
  reservationId: string;
  userId: string;
}
