// Member 4 - Moderation & Administration service.
// Layered on top of the teammate services exactly like communityService does:
// it READS reports with getReports() and keeps its own moderation data
// (hidden state, suspensions, audit log) in separate AsyncStorage keys.
// When the Express backend exists, only the insides of these functions change
// (AsyncStorage -> fetch). The screens stay the same.

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getReports,
  updateReportStatus,
  type RoadReport,
} from "./reportService";
import { type DemoUser, type UserRole } from "./authService";
import { getAllUsers, updateUserRole } from "./moderationUserStore";

// Storage keys (follow the team's @dhaka_route_ naming)
const MODERATION_KEY = "@dhaka_route_moderation";
const SUSPENSIONS_KEY = "@dhaka_route_suspensions";
const AUDIT_KEY = "@dhaka_route_audit";

// Same key communityService stores spam votes under. Read directly
// so the community member's file needs no changes.
const VOTES_KEY = "@dhaka_route_votes";

// A report lands in the flagged queue as soon as ONE user marks it spam.
// When spam votes reach AUTO_FLAG_THRESHOLD the community layer already
// shows it as "Disputed" (communityService uses the same number).
export const AUTO_FLAG_THRESHOLD = 3;

// =====================================
// TYPES
// =====================================

// Who performed a moderation action (the logged-in moderator / admin)
export interface Actor {
  id: string;
  name: string;
  role: UserRole;
}

// Per-report moderation state (kept separate from RoadReport so the
// teammate's report shape never changes)
export interface ModerationRecord {
  hidden: boolean;
  reason: string | null;
  hiddenAt: string | null;
  hiddenBy: string | null;
}

type ModerationMap = Record<string, ModerationRecord>;

// A report in the flagged queue: the base report plus the spam votes
export interface FlaggedReport extends RoadReport {
  confirms: number;
  clears: number;
  spams: number;
  // "auto" = reached the Disputed threshold, "user" = flagged by users but below it
  flagLevel: "auto" | "user";
  hidden: boolean;
}

export type SuspensionStatus = "Active" | "Lifted" | "Expired";

export interface Suspension {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  reason: string;
  // null = suspend until an admin lifts it
  durationDays: number | null;
  suspendedAt: string;
  suspendedByName: string;
  status: SuspensionStatus;
  liftedAt: string | null;
  liftedByName: string | null;
}

export type AuditAction =
  | "VERIFY_REPORT"
  | "REJECT_REPORT"
  | "HIDE_REPORT"
  | "RESTORE_REPORT"
  | "SUSPEND_USER"
  | "LIFT_SUSPENSION"
  | "CHANGE_ROLE"
  | "SEED_DATA";

export type AuditTargetType = "report" | "user" | "system";

export interface AuditEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  targetLabel: string;
  details: string;
  createdAt: string;
}

// Every mutation returns the authService-style result object so screens
// can show the message directly.
export type ModerationResult =
  | { success: true; message: string }
  | { success: false; message: string };

// =====================================
// AUDIT LOG (written by every action)
// =====================================

async function readAudit(): Promise<AuditEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(AUDIT_KEY);

    return raw ? (JSON.parse(raw) as AuditEntry[]) : [];
  } catch (error) {
    console.error("Error loading audit log:", error);

    return [];
  }
}

async function appendAudit(entry: AuditEntry): Promise<void> {
  try {
    const audit = await readAudit();

    audit.unshift(entry);

    await AsyncStorage.setItem(AUDIT_KEY, JSON.stringify(audit));
  } catch (error) {
    console.error("Error saving audit entry:", error);
  }
}

// Shared entry builder so every action logs in the same shape
function buildAuditEntry(
  actor: Actor,
  action: AuditAction,
  targetType: AuditTargetType,
  targetId: string,
  targetLabel: string,
  details: string,
): AuditEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action,
    targetType,
    targetId,
    targetLabel,
    details,
    createdAt: new Date().toISOString(),
  };
}

// Read the audit log, newest first. Screens filter the result.
export async function getAuditLog(): Promise<AuditEntry[]> {
  const audit = await readAudit();

  return [...audit].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

// =====================================
// HIDE / RESTORE REPORTS
// =====================================

async function readModerationMap(): Promise<ModerationMap> {
  try {
    const raw = await AsyncStorage.getItem(MODERATION_KEY);

    return raw ? (JSON.parse(raw) as ModerationMap) : {};
  } catch (error) {
    console.error("Error loading moderation state:", error);

    return {};
  }
}

async function saveModerationMap(map: ModerationMap): Promise<void> {
  try {
    await AsyncStorage.setItem(MODERATION_KEY, JSON.stringify(map));
  } catch (error) {
    console.error("Error saving moderation state:", error);

    throw error;
  }
}

export async function getModerationRecord(
  reportId: string,
): Promise<ModerationRecord> {
  const map = await readModerationMap();

  return (
    map[reportId] ?? {
      hidden: false,
      reason: null,
      hiddenAt: null,
      hiddenBy: null,
    }
  );
}

// IDs of every hidden report, used by the community layer to keep hidden
// reports out of the map and feed
export async function getHiddenReportIds(): Promise<string[]> {
  const map = await readModerationMap();

  return Object.keys(map).filter((reportId) => map[reportId].hidden);
}

export async function isHidden(reportId: string): Promise<boolean> {
  const record = await getModerationRecord(reportId);

  return record.hidden;
}

// Hide a report with a reason. The report keeps its original status so a
// restore brings it back exactly as it was.
export async function hideReport(
  reportId: string,
  reportTitle: string,
  actor: Actor,
  reason: string,
): Promise<ModerationResult> {
  const trimmedReason = reason.trim();

  if (trimmedReason.length < 3) {
    return {
      success: false,
      message:
        "Give a short reason (at least 3 characters) for hiding this report.",
    };
  }

  const reports = await getReports();

  if (!reports.some((report) => report.id === reportId)) {
    return { success: false, message: "Report not found." };
  }

  const map = await readModerationMap();

  if (map[reportId]?.hidden) {
    return { success: false, message: "This report is already hidden." };
  }

  map[reportId] = {
    hidden: true,
    reason: trimmedReason,
    hiddenAt: new Date().toISOString(),
    hiddenBy: actor.name,
  };

  await saveModerationMap(map);

  await appendAudit(
    buildAuditEntry(
      actor,
      "HIDE_REPORT",
      "report",
      reportId,
      reportTitle,
      `Hidden. Reason: ${trimmedReason}`,
    ),
  );

  return {
    success: true,
    message: "Report hidden. It is removed from the map and feed.",
  };
}

export async function restoreReport(
  reportId: string,
  reportTitle: string,
  actor: Actor,
): Promise<ModerationResult> {
  const map = await readModerationMap();

  if (!map[reportId]?.hidden) {
    return { success: false, message: "This report is not hidden." };
  }

  map[reportId] = {
    hidden: false,
    reason: null,
    hiddenAt: null,
    hiddenBy: null,
  };

  await saveModerationMap(map);

  await appendAudit(
    buildAuditEntry(
      actor,
      "RESTORE_REPORT",
      "report",
      reportId,
      reportTitle,
      "Restored to the map and feed.",
    ),
  );

  return { success: true, message: "Report restored." };
}

// =====================================
// FLAGGED REPORT QUEUE
// =====================================

type VoteMap = Record<string, Record<string, string>>; // reportId -> userId -> vote

async function readVotes(): Promise<VoteMap> {
  try {
    const raw = await AsyncStorage.getItem(VOTES_KEY);

    return raw ? (JSON.parse(raw) as VoteMap) : {};
  } catch {
    return {};
  }
}

// Every report with at least one spam vote, newest / most-flagged first.
// The queue also contains hidden reports so a moderator can undo a hide.
export async function getFlaggedReports(): Promise<FlaggedReport[]> {
  const [reports, votes, moderationMap] = await Promise.all([
    getReports(),
    readVotes(),
    readModerationMap(),
  ]);

  const flagged: FlaggedReport[] = [];

  for (const report of reports) {
    // Rejected reports are already removed from the community layer
    if (report.status === "Rejected") continue;

    const forReport = votes[report.id] ?? {};
    const values = Object.values(forReport);
    const confirms = values.filter((v) => v === "confirm").length;
    const clears = values.filter((v) => v === "clear").length;
    const spams = values.filter((v) => v === "spam").length;

    if (spams < 1) continue;

    flagged.push({
      ...report,
      confirms,
      clears,
      spams,
      flagLevel: spams >= AUTO_FLAG_THRESHOLD ? "auto" : "user",
      hidden: moderationMap[report.id]?.hidden ?? false,
    });
  }

  return flagged.sort((a, b) => {
    if (b.spams !== a.spams) return b.spams - a.spams;

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

// =====================================
// VERIFY / REJECT (with audit logging)
// =====================================

// Same trust-score rules as the moderator dashboard, but every change is
// written to the audit log.
export async function setReportStatus(
  reportId: string,
  reportTitle: string,
  status: "Verified" | "Rejected",
  actor: Actor,
): Promise<ModerationResult> {
  const success = await updateReportStatus(reportId, status);

  if (!success) {
    return {
      success: false,
      message:
        "Unable to update this report. It may have already been changed.",
    };
  }

  await appendAudit(
    buildAuditEntry(
      actor,
      status === "Verified" ? "VERIFY_REPORT" : "REJECT_REPORT",
      "report",
      reportId,
      reportTitle,
      `Status set to ${status}. Trust score ${status === "Verified" ? "+5" : "-5"}.`,
    ),
  );

  return {
    success: true,
    message: `Report ${status.toLowerCase()} successfully.`,
  };
}

// =====================================
// REVIEW SCREEN DATA (includes hidden reports)
// =====================================

// One report for the review screen. Unlike the community layer this keeps
// loading the report after it is hidden, so a moderator can restore it.
export interface ModerationReport {
  report: RoadReport;
  moderation: ModerationRecord;
  confirms: number;
  clears: number;
  spams: number;
  // The reporter's public account, used for the Suspend reporter button
  reporter: DemoUser | null;
}

export async function getModerationReport(
  reportId: string,
): Promise<ModerationReport | null> {
  const [reports, votes, users] = await Promise.all([
    getReports(),
    readVotes(),
    getAllUsers(),
  ]);

  const report = reports.find((item) => item.id === reportId);

  if (!report) return null;

  const forReport = votes[report.id] ?? {};
  const values = Object.values(forReport);

  return {
    report,
    moderation: await getModerationRecord(report.id),
    confirms: values.filter((v) => v === "confirm").length,
    clears: values.filter((v) => v === "clear").length,
    spams: values.filter((v) => v === "spam").length,
    reporter: users.find((user) => user.id === report.userId) ?? null,
  };
}

// =====================================
// USER SUSPENSIONS
// =====================================

async function readSuspensions(): Promise<Suspension[]> {
  try {
    const raw = await AsyncStorage.getItem(SUSPENSIONS_KEY);

    return raw ? (JSON.parse(raw) as Suspension[]) : [];
  } catch (error) {
    console.error("Error loading suspensions:", error);

    return [];
  }
}

async function saveSuspensions(suspensions: Suspension[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SUSPENSIONS_KEY, JSON.stringify(suspensions));
  } catch (error) {
    console.error("Error saving suspensions:", error);

    throw error;
  }
}

// A suspension is expired when its duration has passed. Expired is derived,
// never stored, so it stays correct without background jobs.
export function getEffectiveStatus(suspension: Suspension): SuspensionStatus {
  if (suspension.status === "Lifted") return "Lifted";

  if (suspension.durationDays != null) {
    const endsAt =
      new Date(suspension.suspendedAt).getTime() +
      suspension.durationDays * 24 * 3600000;

    if (Date.now() > endsAt) return "Expired";
  }

  return "Active";
}

export async function getSuspensions(): Promise<Suspension[]> {
  const suspensions = await readSuspensions();

  return [...suspensions].sort(
    (a, b) =>
      new Date(b.suspendedAt).getTime() - new Date(a.suspendedAt).getTime(),
  );
}

// The suspension a user is currently serving, or null
export async function getActiveSuspension(
  userId: string,
): Promise<Suspension | null> {
  const suspensions = await readSuspensions();

  return (
    suspensions.find(
      (suspension) =>
        suspension.userId === userId &&
        getEffectiveStatus(suspension) === "Active",
    ) ?? null
  );
}

// Used by the login screen to block suspended accounts
export async function isUserSuspended(userId: string): Promise<boolean> {
  return (await getActiveSuspension(userId)) !== null;
}

export async function suspendUser(
  target: { id: string; name: string; email: string; role: UserRole },
  actor: Actor,
  reason: string,
  durationDays: number | null,
): Promise<ModerationResult> {
  const trimmedReason = reason.trim();

  if (trimmedReason.length < 3) {
    return {
      success: false,
      message:
        "Give a short reason (at least 3 characters) for the suspension.",
    };
  }

  if (target.id === actor.id) {
    return { success: false, message: "You cannot suspend your own account." };
  }

  if (target.role === "admin") {
    return { success: false, message: "Admin accounts cannot be suspended." };
  }

  const existing = await getActiveSuspension(target.id);

  if (existing) {
    return {
      success: false,
      message: "This user already has an active suspension.",
    };
  }

  const suspensions = await readSuspensions();

  const suspension: Suspension = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: target.id,
    userName: target.name,
    userEmail: target.email,
    reason: trimmedReason,
    durationDays,
    suspendedAt: new Date().toISOString(),
    suspendedByName: actor.name,
    status: "Active",
    liftedAt: null,
    liftedByName: null,
  };

  suspensions.unshift(suspension);

  await saveSuspensions(suspensions);

  await appendAudit(
    buildAuditEntry(
      actor,
      "SUSPEND_USER",
      "user",
      target.id,
      target.name,
      durationDays == null
        ? `Suspended until lifted. Reason: ${trimmedReason}`
        : `Suspended for ${durationDays} day(s). Reason: ${trimmedReason}`,
    ),
  );

  return {
    success: true,
    message:
      durationDays == null
        ? `${target.name} is suspended until an admin lifts it.`
        : `${target.name} is suspended for ${durationDays} day(s).`,
  };
}

export async function liftSuspension(
  suspensionId: string,
  actor: Actor,
): Promise<ModerationResult> {
  const suspensions = await readSuspensions();

  const index = suspensions.findIndex(
    (suspension) => suspension.id === suspensionId,
  );

  if (index === -1) {
    return { success: false, message: "Suspension not found." };
  }

  if (suspensions[index].status === "Lifted") {
    return { success: false, message: "This suspension is already lifted." };
  }

  suspensions[index] = {
    ...suspensions[index],
    status: "Lifted",
    liftedAt: new Date().toISOString(),
    liftedByName: actor.name,
  };

  await saveSuspensions(suspensions);

  await appendAudit(
    buildAuditEntry(
      actor,
      "LIFT_SUSPENSION",
      "user",
      suspensions[index].userId,
      suspensions[index].userName,
      "Suspension lifted. The user can log in again.",
    ),
  );

  return {
    success: true,
    message: `${suspensions[index].userName} can log in again.`,
  };
}

// =====================================
// ROLE MANAGEMENT (admin only)
// =====================================

export async function changeUserRole(
  target: { id: string; name: string },
  newRole: UserRole,
  actor: Actor,
): Promise<ModerationResult> {
  if (target.id === actor.id) {
    return {
      success: false,
      message: "You cannot change your own role.",
    };
  }

  const result = await updateUserRole(target.id, newRole);

  if (!result.success) {
    return { success: false, message: result.message };
  }

  await appendAudit(
    buildAuditEntry(
      actor,
      "CHANGE_ROLE",
      "user",
      target.id,
      target.name,
      `Role changed to ${newRole}.`,
    ),
  );

  return {
    success: true,
    message: `${target.name} is now a ${newRole}.`,
  };
}

// =====================================
// LOG A CUSTOM ENTRY (used by seed data)
// =====================================

export async function logAction(
  actor: Actor,
  action: AuditAction,
  targetType: AuditTargetType,
  targetId: string,
  targetLabel: string,
  details: string,
): Promise<void> {
  await appendAudit(
    buildAuditEntry(actor, action, targetType, targetId, targetLabel, details),
  );
}

// Helper for screens: DemoUser -> Actor
export function toActor(user: DemoUser): Actor {
  return { id: user.id, name: user.name, role: user.role };
}
