/** Represents a library patron (user). */
export interface User {
  /** Unique user identifier. */
  id: string;
  /** Full name. */
  name: string;
  /** Email address. */
  email: string;
  /** Phone number (optional). */
  phone?: string;
  /** Whether the user account is active. */
  isActive: boolean;
  /** Maximum number of simultaneous reservations allowed. */
  maxReservations: number;
  /** Date the user registered. */
  registeredAt: Date;
}
