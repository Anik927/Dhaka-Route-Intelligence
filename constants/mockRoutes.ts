export type Coord = { latitude: number; longitude: number };

export type RouteOption = {
  id: number;
  name: string;
  timeMin: number;
  distanceKm: number;
  extraTimeMin: number;
  extraDistanceKm: number;
  disruptionsCrossed: number;
  recommended: boolean;
  path: Coord[]; // fake sample line, not a real road route
};

const START: Coord = { latitude: 23.7985, longitude: 90.38 }; // Kafrul (approx)
const END: Coord = { latitude: 23.8223, longitude: 90.4258 }; // AIUB (approx)

export const mockRoutes: RouteOption[] = [
  {
    id: 1, name: "Normal route", timeMin: 25, distanceKm: 8.2, extraTimeMin: 0, extraDistanceKm: 0, disruptionsCrossed: 2, recommended: false,
    path: [START, { latitude: 23.803, longitude: 90.392 }, { latitude: 23.8113, longitude: 90.4034 }, { latitude: 23.818, longitude: 90.412 }, END],
  },
  {
    id: 2, name: "Alternative 1", timeMin: 31, distanceKm: 9.5, extraTimeMin: 6, extraDistanceKm: 1.3, disruptionsCrossed: 0, recommended: true,
    path: [START, { latitude: 23.81, longitude: 90.38 }, { latitude: 23.82, longitude: 90.39 }, { latitude: 23.827, longitude: 90.405 }, END],
  },
  {
    id: 3, name: "Alternative 2", timeMin: 38, distanceKm: 11.0, extraTimeMin: 13, extraDistanceKm: 2.8, disruptionsCrossed: 1, recommended: false,
    path: [START, { latitude: 23.795, longitude: 90.395 }, { latitude: 23.8, longitude: 90.41 }, { latitude: 23.815, longitude: 90.423 }, END],
  },
];