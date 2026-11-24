
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ReportCategory =
  | "Pothole"
  | "Road Damage"
  | "Waterlogging"
  | "Traffic"
  | "Accident"
  | "Other";

export interface RoadReport {
  id: string;
  userId: string;
  userName: string;
  title: string;
  description: string;
  category: ReportCategory;
  latitude: number | null;
  longitude: number | null;
  imageUri: string | null;
  status: "Pending" | "Verified" | "Rejected";
  createdAt: string;
}

export type TrustLevel =
  | "New Contributor"
  | "Trusted Contributor"
  | "Highly Trusted Contributor"
  | "Expert Contributor";

export interface TrustSummary {
  totalReports: number;
  verifiedReports: number;
  rejectedReports: number;
  pendingReports: number;
  trustScore: number;
  trustLevel: TrustLevel;
}

const REPORTS_STORAGE_KEY = "@dhaka_route_reports";

// Read all reports from storage
export async function getReports(): Promise<RoadReport[]> {
  try {
    const storedReports = await AsyncStorage.getItem(
      REPORTS_STORAGE_KEY
    );

    return storedReports ? JSON.parse(storedReports) : [];
  } catch (error) {
    console.error("Error loading reports:", error);
    throw error;
  }
}

// Save reports to storage
async function saveReports(reports: RoadReport[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      REPORTS_STORAGE_KEY,
      JSON.stringify(reports)
    );
  } catch (error) {
    console.error("Error saving reports:", error);
    throw error;
  }
}

// Create a new report
export async function createReport(
  reportData: Omit<RoadReport, "id" | "status" | "createdAt">
): Promise<RoadReport> {
  const reports = await getReports();

  const newReport: RoadReport = {
    ...reportData,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: "Pending",
    createdAt: new Date().toISOString(),
  };

  reports.unshift(newReport);

  await saveReports(reports);

  return newReport;
}

// Get reports submitted by a specific user
export async function getUserReports(
  userId: string
): Promise<RoadReport[]> {
  const reports = await getReports();

  return reports.filter((report) => report.userId === userId);
}

// Calculate a user's trust score
export async function getUserTrustSummary(
  userId: string
): Promise<TrustSummary> {
  const userReports = await getUserReports(userId);

  const verifiedReports = userReports.filter(
    (report) => report.status === "Verified"
  ).length;

  const rejectedReports = userReports.filter(
    (report) => report.status === "Rejected"
  ).length;

  const pendingReports = userReports.filter(
    (report) => report.status === "Pending"
  ).length;

  const totalReports = userReports.length;

  // Verified: +5 points
  // Rejected: -5 points
  // Pending: 0 points
  const calculatedScore =
    verifiedReports * 5 - rejectedReports * 5;

  // Trust score cannot go below zero
  const trustScore = Math.max(0, calculatedScore);

  // Determine trust level
  let trustLevel: TrustLevel;

  if (trustScore >= 200) {
    trustLevel = "Expert Contributor";
  } else if (trustScore >= 100) {
    trustLevel = "Highly Trusted Contributor";
  } else if (trustScore >= 30) {
    trustLevel = "Trusted Contributor";
  } else {
    trustLevel = "New Contributor";
  }

  return {
    totalReports,
    verifiedReports,
    rejectedReports,
    pendingReports,
    trustScore,
    trustLevel,
  };
}

// Update report status
export async function updateReportStatus(
  reportId: string,
  status: RoadReport["status"]
): Promise<boolean> {
  const reports = await getReports();

  const reportIndex = reports.findIndex(
    (item) => item.id === reportId
  );

  if (reportIndex === -1) {
    return false;
  }

  reports[reportIndex] = {
    ...reports[reportIndex],
    status,
  };

  await saveReports(reports);

  return true;
}
