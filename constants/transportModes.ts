export type TransportMode = {
  id: string;
  label: string;
  orsProfile: string;
  timeFactor: number;
  note?: string;
};

export const transportModes: TransportMode[] = [
  { id: "car", label: "Car", orsProfile: "driving-car", timeFactor: 1.0 },
  { id: "cng", label: "CNG", orsProfile: "driving-car", timeFactor: 1.0, note: "Route follows car roads. Time is an estimate." },
  { id: "bus", label: "Bus", orsProfile: "driving-car", timeFactor: 1.4, note: "Route follows car roads. No bus stops or timetable. Time is an estimate." },
  { id: "rickshaw", label: "Rickshaw", orsProfile: "cycling-regular", timeFactor: 1.0, note: "Route uses the bicycle profile. Time is an estimate." },
  { id: "walking", label: "Walking", orsProfile: "foot-walking", timeFactor: 1.0 },
];