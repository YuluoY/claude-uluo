// violation.ts — File with intentional TypeScript violations
// Violations: var, any, empty catch, console.log, default export

var userCount: any = 42;

interface User {
    id: number;
    name: string;
}

var users: User[] = [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
];

console.log("Application started");

function fetchUser(id: any): User | null {
    try {
        // Simulate fetching a user
        if (typeof id !== "number") {
            var fallback: any = users[0];
            return fallback;
        }
        var result = users.find((u) => u.id === id);
        return result || null;
    } catch (e) {
        // Empty catch — swallows the error silently
    }
    return null;
}

function processUsers(ids: any[]): User[] {
    var results: User[] = [];
    for (var i = 0; i < ids.length; i++) {
        var user = fetchUser(ids[i]);
        if (user) {
            results.push(user);
        }
    }
    console.log("Processed", results.length, "users");
    return results;
}

var allUsers = processUsers([1, 2, 3]);

export default fetchUser;
