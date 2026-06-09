import { HttpClient, HttpClientOptions } from "./HttpClient";
import { NotFoundError, UpstreamError } from "../errors";
import { logger } from "../observability/logger";
import { loadConfig } from "../config";

/**
 * Typed interface for the User service.
 */
export interface User {
  id: string;
  email: string;
  name: string;
  status: "active" | "suspended";
}

const config = loadConfig();

const options: HttpClientOptions = {
  baseUrl: config.USER_SERVICE_URL,
  timeoutMs: config.UPSTREAM_TIMEOUT_USER,
  serviceName: "user-service",
  retries: 2,
};

const http = new HttpClient(options);

export class UserClient {
  /**
   * Fetch a user by ID. Maps upstream 404 to our NotFoundError.
   */
  async getUser(id: string): Promise<User> {
    try {
      const user = await http.request<User>({
        method: "GET",
        path: `/users/${id}`,
      });
      return user;
    } catch (err: unknown) {
      // Upstream 404 -> our domain error
      if (
        err instanceof Error &&
        "status" in err &&
        (err as { status: number }).status === 404
      ) {
        throw new NotFoundError("User", id);
      }
      // Upstream 401/403
      if (
        err instanceof Error &&
        "status" in err &&
        ((err as { status: number }).status === 401 ||
          (err as { status: number }).status === 403)
      ) {
        throw new UpstreamError(
          "USER_ACCESS_DENIED",
          `User service access denied for user ${id}`,
          502,
          false,
          "user-service",
        );
      }
      throw err;
    }
  }

  /**
   * Validate a user exists and is active. Throws if not.
   */
  async validateUser(id: string): Promise<User> {
    const user = await this.getUser(id);
    if (user.status !== "active") {
      throw new UpstreamError(
        "USER_SUSPENDED",
        `User ${id} is suspended`,
        400,
        false,
        "user-service",
      );
    }
    logger.debug({ userId: id }, "User validated");
    return user;
  }
}

export const userClient = new UserClient();
