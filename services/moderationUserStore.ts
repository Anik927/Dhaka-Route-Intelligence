// =====================================
// MEMBER 4: MODERATION USER STORE
// Read/write access to the SAME account list authService keeps
// under "@dhaka_route_users", so the admin screens and the demo
// seeding work WITHOUT modifying the auth member's file.
//
// The key, the stored shape (DemoUser + password) and the
// behaviour below mirror authService exactly. If the auth member
// ever renames the storage key, update this one constant.
// =====================================

import AsyncStorage from "@react-native-async-storage/async-storage";

import type { DemoUser, UserRole } from "./authService";

// Same key authService stores accounts under
const USERS_STORAGE_KEY = "@dhaka_route_users";

// Same internal shape authService stores (public fields + password)
type StoredUser = DemoUser & {
  password: string;
};

async function readUsers(): Promise<StoredUser[]> {
  const raw = await AsyncStorage.getItem(USERS_STORAGE_KEY);

  if (!raw) {
    // authService writes the initial accounts the first time anyone
    // logs in or registers, which always happens before an admin
    // opens one of the screens that use this store.
    return [];
  }

  return JSON.parse(raw) as StoredUser[];
}

async function writeUsers(users: StoredUser[]): Promise<void> {
  await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

// Strip the password before handing an account to the UI
function toSafeUser(user: StoredUser): DemoUser {
  const { password: _password, ...safeUser } = user;

  return safeUser;
}

// All registered accounts, passwords removed, alphabetical by name
export async function getAllUsers(): Promise<DemoUser[]> {
  try {
    const users = await readUsers();

    return users.map(toSafeUser).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Loading users error:", error);

    return [];
  }
}

// Change a user's role. Guarded by the admin-only screens that call it.
export async function updateUserRole(
  userId: string,
  role: UserRole,
): Promise<{ success: true } | { success: false; message: string }> {
  try {
    const users = await readUsers();

    const userIndex = users.findIndex((user) => user.id === userId);

    if (userIndex === -1) {
      return {
        success: false,
        message: "User account not found.",
      };
    }

    users[userIndex] = {
      ...users[userIndex],
      role,
    };

    await writeUsers(users);

    return { success: true };
  } catch (error) {
    console.error("Role update error:", error);

    return {
      success: false,
      message: "Unable to update the role. Please try again.",
    };
  }
}

// Create a seed / demo account if the email is free. Idempotent:
// an existing email is returned unchanged, so seeding twice never
// duplicates accounts.
export async function createSeedUser(
  name: string,
  email: string,
  password: string,
  role: UserRole,
): Promise<
  { success: true; user: DemoUser } | { success: false; message: string }
> {
  try {
    const users = await readUsers();

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = users.find(
      (user) => user.email.toLowerCase() === normalizedEmail,
    );

    if (existingUser) {
      return { success: true, user: toSafeUser(existingUser) };
    }

    const newUser: StoredUser = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      email: normalizedEmail,
      password,
      role,
    };

    users.push(newUser);

    await writeUsers(users);

    return { success: true, user: toSafeUser(newUser) };
  } catch (error) {
    console.error("Seed user error:", error);

    return {
      success: false,
      message: "Unable to create the demo user.",
    };
  }
}
