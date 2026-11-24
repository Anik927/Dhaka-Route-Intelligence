// Saved regular routes (UI-only version, stored on the phone).
// Later these become GET / POST / DELETE /saved-routes calls to the Express server.

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@dhaka_route_saved_routes";
export const MAX_SAVED_ROUTES = 5;

export type TransportMode = "car" | "rickshaw" | "walk";

export const MODE_LABELS: Record<TransportMode, string> = {
  car: "Car / CNG",
  rickshaw: "Rickshaw",
  walk: "Walk",
};

export interface SavedRoute {
  id: string;
  userId: string;
  name: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  transportMode: TransportMode;
  createdAt: string;
}

export type NewSavedRoute = Omit<SavedRoute, "id" | "userId" | "createdAt">;

async function readAll(): Promise<SavedRoute[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedRoute[]) : [];
  } catch {
    return [];
  }
}

// Only the logged-in user's routes are ever returned, newest first.
export async function getSavedRoutes(userId: string): Promise<SavedRoute[]> {
  const all = await readAll();
  return all
    .filter((r) => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function addSavedRoute(userId: string, input: NewSavedRoute): Promise<SavedRoute> {
  const all = await readAll();
  const mine = all.filter((r) => r.userId === userId);
  if (mine.length >= MAX_SAVED_ROUTES) {
    throw new Error(`You can save up to ${MAX_SAVED_ROUTES} routes. Delete one first.`);
  }
  const route: SavedRoute = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify([...all, route]));
  return route;
}

export async function deleteSavedRoute(userId: string, id: string): Promise<void> {
  const all = await readAll();
  const next = all.filter((r) => !(r.id === id && r.userId === userId));
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}