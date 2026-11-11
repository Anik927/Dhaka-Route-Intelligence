
import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  ReactNode,
} from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  DemoUser,
  updateUserProfile,
  updateUserEmail,
  updateUserPassword,
} from "../services/authService";

const AUTH_STORAGE_KEY = "@dhaka_route_session";

// Auth state
interface AuthState {
  user: DemoUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Auth actions
type AuthAction =
  | { type: "LOGIN"; payload: DemoUser }
  | { type: "LOGOUT" }
  | { type: "RESTORE_SESSION"; payload: DemoUser | null }
  | { type: "UPDATE_PROFILE"; payload: DemoUser };

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
};

// Reducer
function authReducer(
  state: AuthState,
  action: AuthAction
): AuthState {
  switch (action.type) {
    case "LOGIN":
      return {
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
      };

    case "LOGOUT":
      return {
        user: null,
        isAuthenticated: false,
        isLoading: false,
      };

    case "RESTORE_SESSION":
      return {
        user: action.payload,
        isAuthenticated: action.payload !== null,
        isLoading: false,
      };

    case "UPDATE_PROFILE":
      return {
        ...state,
        user: action.payload,
      };

    default:
      return state;
  }
}

// Context interface
interface AuthContextType {
  user: DemoUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: DemoUser) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updatedUser: DemoUser) => Promise<void>;
  updateEmail: (newEmail: string) => Promise<void>;
  updatePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

// Auth Provider
export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(
    authReducer,
    initialState
  );

  // Restore session
  useEffect(() => {
    async function restoreSession() {
      try {
        const storedSession = await AsyncStorage.getItem(
          AUTH_STORAGE_KEY
        );

        const savedUser: DemoUser | null = storedSession
          ? JSON.parse(storedSession)
          : null;

        dispatch({
          type: "RESTORE_SESSION",
          payload: savedUser,
        });
      } catch (error) {
        console.error("Session restoration error:", error);

        dispatch({
          type: "RESTORE_SESSION",
          payload: null,
        });
      }
    }

    restoreSession();
  }, []);

  // Login
  async function login(user: DemoUser) {
    try {
      await AsyncStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify(user)
      );

      dispatch({
        type: "LOGIN",
        payload: user,
      });
    } catch (error) {
      console.error("Login session error:", error);
      throw error;
    }
  }

  // Update name
  async function updateProfile(updatedUser: DemoUser) {
    if (!state.user || state.user.id !== updatedUser.id) {
      throw new Error("Invalid profile update.");
    }

    if (
      state.user.email !== updatedUser.email ||
      state.user.role !== updatedUser.role
    ) {
      throw new Error("Email and role cannot be changed here.");
    }

    if (updatedUser.name.trim().length < 2) {
      throw new Error("Name must contain at least 2 characters.");
    }

    const result = await updateUserProfile(
      state.user.id,
      updatedUser.name
    );

    if (!result.success) {
      throw new Error(result.message);
    }

    await AsyncStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify(result.user)
    );

    dispatch({
      type: "UPDATE_PROFILE",
      payload: result.user,
    });
  }

  // Update email
  async function updateEmail(newEmail: string) {
    if (!state.user) {
      throw new Error("Please log in first.");
    }

    const result = await updateUserEmail(
      state.user.id,
      newEmail
    );

    if (!result.success) {
      throw new Error(result.message);
    }

    await AsyncStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify(result.user)
    );

    dispatch({
      type: "UPDATE_PROFILE",
      payload: result.user,
    });
  }

  // Update password
  async function updatePassword(
    currentPassword: string,
    newPassword: string
  ) {
    if (!state.user) {
      throw new Error("Please log in first.");
    }

    const result = await updateUserPassword(
      state.user.id,
      currentPassword,
      newPassword
    );

    if (!result.success) {
      throw new Error(result.message);
    }
  }

  // Logout
  async function logout() {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);

      dispatch({
        type: "LOGOUT",
      });
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isLoading: state.isLoading,
        login,
        logout,
        updateProfile,
        updateEmail,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}
