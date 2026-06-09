import { ReservationService } from '../src/services/reservation.service';
import { clearAllReservations } from '../src/data/reservations';
import { ReservationStatus } from '../src/types/reservation';
import { NotFoundError, ConflictError, BusinessRuleViolationError } from '../src/utils/errors';

describe('ReservationService', () => {
  let service: ReservationService;

  beforeEach(() => {
    clearAllReservations();
    service = new ReservationService(5, 72);
  });

  describe('reserve', () => {
    it('should create a reservation for an available book', () => {
      const reservation = service.reserve({
        bookIsbn: '978-0-14-118776-1',
        userId: 'user-001',
      });

      expect(reservation).toBeDefined();
      expect(reservation.id).toBeTruthy();
      expect(reservation.status).toBe(ReservationStatus.ACTIVE);
      expect(reservation.bookIsbn).toBe('978-0-14-118776-1');
      expect(reservation.userId).toBe('user-001');
      expect(reservation.pickupDeadline).toBeDefined();
      expect(reservation.createdAt).toBeDefined();
      expect(reservation.updatedAt).toBeDefined();
    });

    it('should throw NotFoundError when book does not exist', () => {
      expect(() =>
        service.reserve({
          bookIsbn: '000-0-000-00000-0',
          userId: 'user-001',
        }),
      ).toThrow(NotFoundError);
    });

    it('should throw ConflictError when no copies are available', () => {
      // JavaScript: The Good Parts has 0 available copies in seed data.
      expect(() =>
        service.reserve({
          bookIsbn: '978-0-596-51774-8',
          userId: 'user-001',
        }),
      ).toThrow(ConflictError);
    });

    it('should throw ConflictError when user already has an active reservation for the same book', () => {
      service.reserve({
        bookIsbn: '978-0-14-118776-1',
        userId: 'user-001',
      });

      expect(() =>
        service.reserve({
          bookIsbn: '978-0-14-118776-1',
          userId: 'user-001',
        }),
      ).toThrow(ConflictError);
    });

    it('should throw BusinessRuleViolationError when user exceeds max reservations', () => {
      const limitedService = new ReservationService(1, 72);

      limitedService.reserve({
        bookIsbn: '978-0-14-118776-1',
        userId: 'user-001',
      });

      expect(() =>
        limitedService.reserve({
          bookIsbn: '978-0-06-112008-4',
          userId: 'user-001',
        }),
      ).toThrow(BusinessRuleViolationError);
    });

    it('should allow multiple users to reserve different books', () => {
      const r1 = service.reserve({
        bookIsbn: '978-0-14-118776-1',
        userId: 'user-001',
      });
      const r2 = service.reserve({
        bookIsbn: '978-0-06-112008-4',
        userId: 'user-002',
      });

      expect(r1.id).not.toBe(r2.id);
      expect(r1.status).toBe(ReservationStatus.ACTIVE);
      expect(r2.status).toBe(ReservationStatus.ACTIVE);
    });
  });

  describe('cancel', () => {
    it('should cancel an active reservation', () => {
      const reservation = service.reserve({
        bookIsbn: '978-0-14-118776-1',
        userId: 'user-001',
      });

      const cancelled = service.cancel({
        reservationId: reservation.id,
        userId: 'user-001',
      });

      expect(cancelled.status).toBe(ReservationStatus.CANCELLED);
      expect(cancelled.id).toBe(reservation.id);
    });

    it('should throw NotFoundError when reservation does not exist', () => {
      expect(() =>
        service.cancel({
          reservationId: 'non-existent-id',
          userId: 'user-001',
        }),
      ).toThrow(NotFoundError);
    });

    it('should throw BusinessRuleViolationError when cancelling someone else\'s reservation', () => {
      const reservation = service.reserve({
        bookIsbn: '978-0-14-118776-1',
        userId: 'user-001',
      });

      expect(() =>
        service.cancel({
          reservationId: reservation.id,
          userId: 'user-002',
        }),
      ).toThrow(BusinessRuleViolationError);
    });

    it('should throw ConflictError when cancelling an already cancelled reservation', () => {
      const reservation = service.reserve({
        bookIsbn: '978-0-14-118776-1',
        userId: 'user-001',
      });

      service.cancel({ reservationId: reservation.id, userId: 'user-001' });

      expect(() =>
        service.cancel({ reservationId: reservation.id, userId: 'user-001' }),
      ).toThrow(ConflictError);
    });
  });

  describe('isBookAvailable', () => {
    it('should return available=true for a book with available copies', () => {
      const result = service.isBookAvailable('978-0-14-118776-1');
      expect(result.available).toBe(true);
      expect(result.availableCopies).toBeGreaterThan(0);
    });

    it('should throw NotFoundError for a non-existent book', () => {
      expect(() => service.isBookAvailable('000-0-000-00000-0')).toThrow(NotFoundError);
    });
  });

  describe('getUserReservations', () => {
    it('should return all active reservations for a user', () => {
      service.reserve({ bookIsbn: '978-0-14-118776-1', userId: 'user-001' });
      service.reserve({ bookIsbn: '978-0-06-112008-4', userId: 'user-001' });

      const reservations = service.getUserReservations('user-001');
      expect(reservations.length).toBe(2);
      expect(
        reservations.every((r) => r.userId === 'user-001' && r.status === ReservationStatus.ACTIVE),
      ).toBe(true);
    });

    it('should return an empty array for a user with no reservations', () => {
      const reservations = service.getUserReservations('user-999');
      expect(reservations).toEqual([]);
    });
  });
});
