import { Request, Response, NextFunction } from 'express';
import { reservationService } from '../services/reservation.service';
import { CreateReservationInput, CancelReservationInput } from '../types/reservation';

/**
 * Controller handling reservation HTTP requests.
 */
export class ReservationController {
  /**
   * POST /api/reservations
   * Body: { bookIsbn: string, userId: string, notes?: string }
   */
  create(req: Request, res: Response, next: NextFunction): void {
    try {
      const input: CreateReservationInput = {
        bookIsbn: req.body.bookIsbn,
        userId: req.body.userId,
        notes: req.body.notes,
      };

      const reservation = reservationService.reserve(input);
      res.status(201).json(reservation);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/reservations/:id/cancel
   * Body: { userId: string }
   */
  cancel(req: Request, res: Response, next: NextFunction): void {
    try {
      const input: CancelReservationInput = {
        reservationId: req.params.id,
        userId: req.body.userId,
      };

      const reservation = reservationService.cancel(input);
      res.json(reservation);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/reservations/:id
   */
  getById(req: Request, res: Response, next: NextFunction): void {
    try {
      const reservation = reservationService.getReservation(req.params.id);
      res.json(reservation);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/users/:userId/reservations
   * List all active reservations for a user.
   */
  getUserReservations(req: Request, res: Response, next: NextFunction): void {
    try {
      const reservations = reservationService.getUserReservations(
        req.params.userId,
      );
      res.json(reservations);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/books/:isbn/availability
   * Check if a book is available for reservation.
   */
  checkAvailability(req: Request, res: Response, next: NextFunction): void {
    try {
      const result = reservationService.isBookAvailable(req.params.isbn);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const reservationController = new ReservationController();
