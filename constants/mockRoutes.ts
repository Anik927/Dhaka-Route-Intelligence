export type RouteOption = {
  id: number;
  name: string;
  timeMin: number;
  distanceKm: number;
  extraTimeMin: number;
  extraDistanceKm: number;
  disruptionsCrossed: number;
  recommended: boolean;
};

export const mockRoutes: RouteOption[] = [
  { id: 1, name: "Normal route", timeMin: 25, distanceKm: 8.2, extraTimeMin: 0, extraDistanceKm: 0, disruptionsCrossed: 2, recommended: false },
  { id: 2, name: "Alternative 1", timeMin: 31, distanceKm: 9.5, extraTimeMin: 6, extraDistanceKm: 1.3, disruptionsCrossed: 0, recommended: true },
  { id: 3, name: "Alternative 2", timeMin: 38, distanceKm: 11.0, extraTimeMin: 13, extraDistanceKm: 2.8, disruptionsCrossed: 1, recommended: false },
];