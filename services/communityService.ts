// Community layer on top of your teammate's reportService.
// It only READS reports with getReports() and keeps its own votes.
// When the Express backend exists, only the insides of these functions change
// (AsyncStorage -> fetch). The screens stay the same.

import AsyncStorage from "@react-native-async-storage/async-storage";

import { getReports, type ReportCategory, type RoadReport } from "./reportService";

const VOTES_KEY = "@dhaka_route_votes";

export const CATEGORIES: ReportCategory[] = [
  "Pothole",
  "Road Damage",
  "Waterlogging",
  "Traffic",
  "Accident",
  "Other",
];

// TODO when the team adds severity (slow / partial / blocked), colour pins by severity instead.
export const CATEGORY_COLORS: Record<ReportCategory, string> = {
  Pothole: "#8d6e63",
  "Road Damage": "#6d4c41",
  Waterlogging: "#1976d2",
  Traffic: "#f57c00",
  Accident: "#d32f2f",
  Other: "#757575",
};

export type VoteType = "confirm" | "clear" | "spam";
export type CommunityStatus = "Active" | "Disputed" | "Cleared" | "Expired";

export const STATUS_COLORS: Record<CommunityStatus, string> = {
  Active: "#2e7d32",
  Disputed: "#ef6c00",
  Cleared: "#1565c0",
  Expired: "#757575",
};

export interface CommunityReport extends RoadReport {
  latitude: number; // the map needs real coordinates
  longitude: number;
  source: "user" | "seed";
  confirms: number;
  clears: number;
  spams: number;
  myVote: VoteType | null;
  communityStatus: CommunityStatus;
  expiresAt: string | null;
}

// Proposed values. The team can change them.
const T = { clear: 3, spam: 3, baseHours: 4, extendHours: 1, maxHours: 6 };

type VoteMap = Record<string, Record<string, VoteType>>; // reportId -> userId -> vote

// ---------- demo data (labelled as team-seeded, never expires) ----------
function seedReports(): RoadReport[] {
  const now = Date.now();
  const ago = (min: number) => new Date(now - min * 60000).toISOString();
  const base = {
    userId: "seed",
    userName: "Team seed data",
    imageUri: null,
    status: "Verified" as const,
  };
  // Replace with real flood-prone spots your team knows along the demo corridor.
  return [
    { ...base, id: "seed-1", title: "Waterlogged road", description: "Team-seeded demo report. Water covers most of the road.", category: "Waterlogging", latitude: 23.8113, longitude: 90.4034, createdAt: ago(25) },
    { ...base, id: "seed-2", title: "Accident blocking one lane", description: "Team-seeded demo report. One lane is blocked.", category: "Accident", latitude: 23.818, longitude: 90.412, createdAt: ago(70) },
    { ...base, id: "seed-3", title: "Procession slowing traffic", description: "Team-seeded demo report. Heavy slow traffic.", category: "Traffic", latitude: 23.8075, longitude: 90.393, createdAt: ago(10) },
    { ...base, id: "seed-4", title: "Large pothole", description: "Team-seeded demo report. Vehicles slow down here.", category: "Pothole", latitude: 23.823, longitude: 90.417, createdAt: ago(200) },
  ];
}

// ---------- votes storage ----------
async function readVotes(): Promise<VoteMap> {
  try {
    const raw = await AsyncStorage.getItem(VOTES_KEY);
    return raw ? (JSON.parse(raw) as VoteMap) : {};
  } catch {
    return {};
  }
}

// ---------- rules ----------
function toCommunity(
  r: RoadReport,
  source: "user" | "seed",
  votes: VoteMap,
  userId: string | null
): CommunityReport | null {
  // Show Pending and Verified. Hide Rejected, and anything without coordinates.
  if (r.latitude == null || r.longitude == null || r.status === "Rejected") return null;

  const forReport = votes[r.id] ?? {};
  const values = Object.values(forReport);
  const confirms = values.filter((v) => v === "confirm").length;
  const clears = values.filter((v) => v === "clear").length;
  const spams = values.filter((v) => v === "spam").length;

  let expiresAt: string | null = null;
  let expired = false;
  if (source === "user") {
    const hours = Math.min(T.baseHours + confirms * T.extendHours, T.maxHours);
    const exp = new Date(r.createdAt).getTime() + hours * 3600000;
    expiresAt = new Date(exp).toISOString();
    expired = Date.now() > exp;
  }

  let communityStatus: CommunityStatus = "Active";
  if (expired) communityStatus = "Expired";
  else if (clears >= T.clear && clears > confirms) communityStatus = "Cleared";
  else if (spams >= T.spam) communityStatus = "Disputed";

  return {
    ...r,
    latitude: r.latitude,
    longitude: r.longitude,
    source,
    confirms,
    clears,
    spams,
    myVote: userId ? forReport[userId] ?? null : null,
    communityStatus,
    expiresAt,
  };
}

async function loadAll(userId: string | null): Promise<CommunityReport[]> {
  const [userReports, votes] = await Promise.all([getReports(), readVotes()]);
  const list = [
    ...userReports.map((r) => toCommunity(r, "user", votes, userId)),
    ...seedReports().map((r) => toCommunity(r, "seed", votes, userId)),
  ];
  return list.filter((r): r is CommunityReport => r !== null);
}

// ---------- functions used by the screens ----------

// Reports shown on the map and feed (Active and Disputed).
export async function getActiveReports(userId: string | null): Promise<CommunityReport[]> {
  const all = await loadAll(userId);
  return all.filter((r) => r.communityStatus === "Active" || r.communityStatus === "Disputed");
}

export async function getReportById(id: string, userId: string | null): Promise<CommunityReport | null> {
  const all = await loadAll(userId);
  return all.find((r) => r.id === id) ?? null;
}

// One vote per user per report. Tapping the same vote again removes it.
export async function voteOnReport(
  reportId: string,
  userId: string,
  type: VoteType
): Promise<CommunityReport> {
  const report = await getReportById(reportId, userId);
  if (!report) throw new Error("Report not found.");
  if (report.userId === userId) throw new Error("You cannot vote on your own report.");

  const votes = await readVotes();
  const forReport = votes[reportId] ?? {};
  if (forReport[userId] === type) delete forReport[userId];
  else forReport[userId] = type;
  votes[reportId] = forReport;
  await AsyncStorage.setItem(VOTES_KEY, JSON.stringify(votes));

  const updated = await getReportById(reportId, userId);
  if (!updated) throw new Error("Report not found.");
  return updated;
}