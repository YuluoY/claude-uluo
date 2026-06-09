import { Reservation, ReservationStatus } from '../types/reservation';

/**
 * In-memory reservation store.
 * Keyed by reservation ID.
 */
const reservations: Map<string, Reservation> = new Map();

/** Retrieve all reservations (shallow copy of values). */
export function getAllReservations(): Reservation[] {
  return Array.from(reservations.values());
}

/** Retrieve a single reservation by its ID. */
export function getReservationById(id: string): Reservation | undefined {
  return reservations.get(id);
}

/** Retrieve all ACTIVE reservations for a given user. */
export function getActiveReservationsByUser(userId: string): Reservation[] {
  const result: Reservation[] = [];
  for (const r of reservations.values()) {
    if (r.userId === userId && r.status === ReservationStatus.ACTIVE) {
      result.push(r);
    }
  }
  return result;
}

/** Retrieve all ACTIVE reservations for a given book (by ISBN). */
export function getActiveReservationsByBook(isbn: string): Reservation[] {
  const result: Reservation[] = [];
  for (const r of reservations.values()) {
    if (r.bookIsbn === isbn && r.status === ReservationStatus.ACTIVE) {
      result.push(r);
    }
  }
  return result;
}

/** Insert a new reservation into the store. */
export function insertReservation(reservation: Reservation): void {
  reservations.set(reservation.id, reservation);
}

/** Update the status (and optionally pickupDeadline) of a reservation. */
export function updateReservationStatus(
  id: string,
  status: ReservationStatus,
): Reservation | undefined {
  const reservation = reservations.get(id);
  if (reservation) {
    reservation.status = status;
    reservation.updatedAt = new Date();
  }
  return reservation;
}

/** Remove a reservation from the store (for testing/cleanup). */
export function deleteReservation(id: string): boolean {
  return reservations.delete(id);
}

/** Clear all reservations (useful for testing). */
export function clearAllReservations(): void {
  reservations.clear();
}
