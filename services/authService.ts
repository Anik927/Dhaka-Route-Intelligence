
import AsyncStorage from "@react-native-async-storage/async-storage";

// User roles
export type UserRole = "user" | "moderator" | "admin";

// Public user interface
export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

// Internal user interface
type StoredUser = DemoUser & {
  password: string;
};

const USERS_STORAGE_KEY = "@dhaka_route_users";

// Initial demo accounts
const initialUsers: StoredUser[] = [
  {
    id: "1",
    name: "Demo Student",
    email: "student@dhakaroute.com",
    password: "12345678",
    role: "user",
  },
  {
    id: "2",
    name: "Demo Moderator",
    email: "moderator@dhakaroute.com",
    password: "12345678",
    role: "moderator",
  },
  {
    id: "3",
    name: "Demo Admin",
    email: "admin@dhakaroute.com",
    password: "12345678",
    role: "admin",
  },
];

// Remove password before returning user information
function getSafeUser(user: StoredUser): DemoUser {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

// Load users
async function getStoredUsers(): Promise<StoredUser[]> {
  try {
    const storedUsers = await AsyncStorage.getItem(
      USERS_STORAGE_KEY
    );

    if (storedUsers) {
      return JSON.parse(storedUsers) as StoredUser[];
    }

    await AsyncStorage.setItem(
      USERS_STORAGE_KEY,
      JSON.stringify(initialUsers)
    );

    return initialUsers;
  } catch (error) {
    console.error("Error loading users:", error);
    throw error;
  }
}

// Save users
async function saveUsers(users: StoredUser[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      USERS_STORAGE_KEY,
      JSON.stringify(users)
    );
  } catch (error) {
    console.error("Error saving users:", error);
    throw error;
  }
}

// =====================================
// LOGIN
// =====================================

export async function loginDemo(
  email: string,
  password: string
): Promise<
  | { success: true; user: DemoUser }
  | { success: false; message: string }
> {
  try {
    const users = await getStoredUsers();

    const normalizedEmail = email.trim().toLowerCase();

    const user = users.find(
      (item) =>
        item.email.toLowerCase() === normalizedEmail &&
        item.password === password
    );

    if (!user) {
      return {
        success: false,
        message: "Incorrect email or password.",
      };
    }

    return {
      success: true,
      user: getSafeUser(user),
    };
  } catch (error) {
    console.error("Login error:", error);

    return {
      success: false,
      message: "Unable to login. Please try again.",
    };
  }
}

// =====================================
// REGISTRATION
// =====================================

export async function registerDemo(
  name: string,
  email: string,
  password: string
): Promise<
  | { success: true; user: DemoUser }
  | { success: false; message: string }
> {
  try {
    const users = await getStoredUsers();

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName || !normalizedEmail || !password) {
      return {
        success: false,
        message: "All fields are required.",
      };
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      return {
        success: false,
        message: "Enter a valid email address.",
      };
    }

    if (password.length < 8) {
      return {
        success: false,
        message: "Password must be at least 8 characters.",
      };
    }

    const existingUser = users.find(
      (user) => user.email.toLowerCase() === normalizedEmail
    );

    if (existingUser) {
      return {
        success: false,
        message: "An account with this email already exists.",
      };
    }

    const newUser: StoredUser = {
      id: `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      name: normalizedName,
      email: normalizedEmail,
      password,
      role: "user",
    };

    users.push(newUser);

    await saveUsers(users);

    return {
      success: true,
      user: getSafeUser(newUser),
    };
  } catch (error) {
    console.error("Registration error:", error);

    return {
      success: false,
      message: "Unable to register. Please try again.",
    };
  }
}

// =====================================
// UPDATE USER NAME
// =====================================

export async function updateUserProfile(
  userId: string,
  updatedName: string
): Promise<
  | { success: true; user: DemoUser }
  | { success: false; message: string }
> {
  try {
    const users = await getStoredUsers();

    const userIndex = users.findIndex(
      (user) => user.id === userId
    );

    if (userIndex === -1) {
      return {
        success: false,
        message: "User account not found.",
      };
    }

    const trimmedName = updatedName.trim();

    if (trimmedName.length < 2) {
      return {
        success: false,
        message: "Name must contain at least 2 characters.",
      };
    }

    users[userIndex] = {
      ...users[userIndex],
      name: trimmedName,
    };

    await saveUsers(users);

    return {
      success: true,
      user: getSafeUser(users[userIndex]),
    };
  } catch (error) {
    console.error("Profile update error:", error);

    return {
      success: false,
      message: "Unable to update your profile.",
    };
  }
}

// =====================================
// UPDATE EMAIL
// =====================================

export async function updateUserEmail(
  userId: string,
  newEmail: string
): Promise<
  | { success: true; user: DemoUser }
  | { success: false; message: string }
> {
  try {
    const users = await getStoredUsers();

    const userIndex = users.findIndex(
      (user) => user.id === userId
    );

    if (userIndex === -1) {
      return {
        success: false,
        message: "User account not found.",
      };
    }

    const normalizedEmail = newEmail.trim().toLowerCase();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      return {
        success: false,
        message: "Enter a valid email address.",
      };
    }

    const emailExists = users.some(
      (user) =>
        user.email.toLowerCase() === normalizedEmail &&
        user.id !== userId
    );

    if (emailExists) {
      return {
        success: false,
        message: "This email is already registered.",
      };
    }

    users[userIndex] = {
      ...users[userIndex],
      email: normalizedEmail,
    };

    await saveUsers(users);

    return {
      success: true,
      user: getSafeUser(users[userIndex]),
    };
  } catch (error) {
    console.error("Email update error:", error);

    return {
      success: false,
      message: "Unable to update email. Please try again.",
    };
  }
}

// =====================================
// UPDATE PASSWORD
// =====================================

export async function updateUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<
  { success: true } | { success: false; message: string }
> {
  try {
    const users = await getStoredUsers();

    const userIndex = users.findIndex(
      (user) => user.id === userId
    );

    if (userIndex === -1) {
      return {
        success: false,
        message: "User account not found.",
      };
    }

    if (users[userIndex].password !== currentPassword) {
      return {
        success: false,
        message: "Current password is incorrect.",
      };
    }

    if (newPassword.length < 8) {
      return {
        success: false,
        message: "New password must be at least 8 characters.",
      };
    }

    if (newPassword === currentPassword) {
      return {
        success: false,
        message: "New password must be different.",
      };
    }

    users[userIndex] = {
      ...users[userIndex],
      password: newPassword,
    };

    await saveUsers(users);

    return { success: true };
  } catch (error) {
    console.error("Password update error:", error);

    return {
      success: false,
      message: "Unable to update password. Please try again.",
    };
  }
}
