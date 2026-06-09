// violation-fixed.ts — Fixed version with all violations resolved
//
// Fixes applied:
// 1. var → const/let: Block-scoped declarations prevent hoisting bugs
//    - var userCount   → const userCount
//    - var users       → const users
//    - var fallback    → const fallback
//    - var result      → const result
//    - var results     → const results
//    - var i           → let i (mutated in loop)
//    - var user        → const user
//    - var allUsers    → const allUsers
//
// 2. any → proper types: Enables compile-time type checking
//    - userCount: any      → userCount: number
//    - fetchUser(id: any)  → fetchUser(id: number)
//    - fallback: any       → fallback: User (inferred)
//    - processUsers(ids: any[]) → processUsers(ids: number[])
//
// 3. Empty catch → handled: Error is logged via logger, not swallowed
//
// 4. console.log → logger: Centralized logging for consistency and testability
//
// 5. default export → named export: Better tree-shaking, clearer imports, IDE auto-completion

interface User {
    id: number;
    name: string;
}

// Centralized logger (could be replaced with a real implementation like winston/pino)
const logger = {
    info: (message: string, ...args: unknown[]): void => {
        // In production, route to a proper logging service
        process.stdout.write(`[INFO] ${message} ${args.join(" ")}\n`);
    },
    error: (message: string, error?: unknown): void => {
        process.stderr.write(`[ERROR] ${message} ${error ? String(error) : ""}\n`);
    },
};

const userCount: number = 42;

const users: User[] = [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
];

logger.info("Application started");

function fetchUser(id: number): User | null {
    try {
        if (typeof id !== "number") {
            const fallback: User | null = users[0] ?? null;
            return fallback;
        }
        const result = users.find((u) => u.id === id);
        return result ?? null;
    } catch (error: unknown) {
        // Log the error instead of silently swallowing it
        logger.error("Failed to fetch user", error);
        return null;
    }
}

function processUsers(ids: number[]): User[] {
    const results: User[] = [];
    for (let i = 0; i < ids.length; i++) {
        const user = fetchUser(ids[i]);
        if (user) {
            results.push(user);
        }
    }
    logger.info(`Processed ${results.length} users`);
    return results;
}

const allUsers = processUsers([1, 2, 3]);

export { fetchUser, processUsers, users, userCount, allUsers };
