import { mockRoutes, type RouteOption } from "../constants/mockRoutes";

// Midterm: returns fake data.
// Final: replace the body with fetch("POST /route") to the backend.
export async function getRouteOptions(
  origin: string,
  destination: string,
  modeId: string
): Promise<RouteOption[]> {
  await new Promise((resolve) => setTimeout(resolve, 600)); // pretend to wait for the server
  return mockRoutes;
}