// Member 4 - Seed data for the moderation demo.
// Only uses the PUBLIC functions of the other services (create users,
// create reports, vote, suspend) so seeding behaves exactly like real
// app usage and every moderation action lands in the audit log.
// Idempotent: a storage flag stops it from running twice.

import AsyncStorage from "@react-native-async-storage/async-storage";

import { type DemoUser } from "./authService";
import { createSeedUser } from "./moderationUserStore";
import { createReport, updateReportStatus } from "./reportService";
import { voteOnReport } from "./communityService";
import {
  logAction,
  suspendUser,
  toActor,
  type Actor,
} from "./moderationService";

const SEED_FLAG_KEY = "@dhaka_route_seed_m4";

export interface SeedResult {
  seeded: boolean; // true = data was created now, false = already seeded before
  message: string;
}

export async function isSeeded(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SEED_FLAG_KEY)) === "done";
  } catch {
    return false;
  }
}

// Password for every seeded account (same as the team's demo accounts)
const SEED_PASSWORD = "12345678";

export async function seedDemoData(actor: Actor): Promise<SeedResult> {
  if (await isSeeded()) {
    return {
      seeded: false,
      message:
        "Demo data was already loaded. Reset the app storage to load it again.",
    };
  }

  // ---------- 1. Demo citizens ----------
  const rashed = await createSeedUser(
    "Rashed Karim",
    "rashed@student.dhakaroute.com",
    SEED_PASSWORD,
    "user",
  );
  const tania = await createSeedUser(
    "Tania Akter",
    "tania@student.dhakaroute.com",
    SEED_PASSWORD,
    "user",
  );
  const karim = await createSeedUser(
    "Karim Uddin",
    "karim@student.dhakaroute.com",
    SEED_PASSWORD,
    "user",
  );
  const nusrat = await createSeedUser(
    "Nusrat Jahan",
    "nusrat@student.dhakaroute.com",
    SEED_PASSWORD,
    "user",
  );

  const citizens = [rashed, tania, karim, nusrat].filter(
    (result): result is { success: true; user: DemoUser } => result.success,
  );

  const byName = (name: string) =>
    citizens.find((result) => result.user.name === name)?.user;

  const rashedUser = byName("Rashed Karim");
  const taniaUser = byName("Tania Akter");
  const karimUser = byName("Karim Uddin");
  const nusratUser = byName("Nusrat Jahan");

  if (!rashedUser || !taniaUser || !karimUser || !nusratUser) {
    return { seeded: false, message: "Could not create the demo users." };
  }

  // ---------- 2. Demo reports along the campus corridor ----------
  // Report 1: verified waterlogging report
  const report1 = await createReport({
    userId: rashedUser.id,
    userName: rashedUser.name,
    title: "Deep water near Russell Square crossing",
    description:
      "Water covers the whole crossing after the rain. Rickshaws stall in the middle.",
    category: "Waterlogging",
    latitude: 23.8122,
    longitude: 90.4017,
    imageUri: null,
  });
  await updateReportStatus(report1.id, "Verified");

  // Report 2: fake report that three users already marked as spam (auto-flagged)
  const report2 = await createReport({
    userId: karimUser.id,
    userName: karimUser.name,
    title: "Road fully closed for construction",
    description:
      "Someone reported a full closure but the road is actually open. Marked as spam by users.",
    category: "Road Damage",
    latitude: 23.8156,
    longitude: 90.4055,
    imageUri: null,
  });

  // Report 3: suspicious report with one spam vote (user-flagged)
  const report3 = await createReport({
    userId: taniaUser.id,
    userName: taniaUser.name,
    title: "Rally blocking Dhanmondi road",
    description:
      "Claims a rally is blocking the road, but no other user has confirmed it.",
    category: "Traffic",
    latitude: 23.8089,
    longitude: 90.3995,
    imageUri: null,
  });
  await updateReportStatus(report3.id, "Verified");

  // Report 4: fresh accident report still pending review
  const report4 = await createReport({
    userId: nusratUser.id,
    userName: nusratUser.name,
    title: "Bus and rickshaw collision at Bijoy Sarani",
    description:
      "Two vehicles collided at the turn. Traffic is being directed around it.",
    category: "Accident",
    latitude: 23.8178,
    longitude: 90.4092,
    imageUri: null,
  });

  // Report 5: verified pothole report
  const report5 = await createReport({
    userId: rashedUser.id,
    userName: rashedUser.name,
    title: "Potholes after rainfall near lake",
    description:
      "Three deep potholes filled with water. Cars swerve into the other lane.",
    category: "Pothole",
    latitude: 23.8205,
    longitude: 90.4138,
    imageUri: null,
  });
  await updateReportStatus(report5.id, "Verified");

  // ---------- 3. Community votes ----------
  // Three spam votes push report 2 over the Disputed threshold -> auto-flagged
  await voteOnReport(report2.id, rashedUser.id, "spam");
  await voteOnReport(report2.id, nusratUser.id, "spam");
  await voteOnReport(report2.id, taniaUser.id, "spam");

  // One spam vote puts report 3 into the flagged queue as user-flagged
  await voteOnReport(report3.id, rashedUser.id, "spam");

  // A few confirms keep the healthy reports active
  await voteOnReport(report5.id, karimUser.id, "confirm");
  await voteOnReport(report5.id, nusratUser.id, "confirm");

  // ---------- 4. One active suspension (Tania, 7 days) ----------
  const suspension = await suspendUser(
    {
      id: taniaUser.id,
      name: taniaUser.name,
      email: taniaUser.email,
      role: taniaUser.role,
    },
    actor,
    "Submitted a fake road-closure report that wasted riders' time.",
    7,
  );

  // ---------- 5. One audit entry summarising the seed ----------
  await logAction(
    actor,
    "SEED_DATA",
    "system",
    "seed",
    "Demo data",
    `Seeded ${citizens.length} users, 5 reports, community votes${
      suspension.success ? ", 1 active suspension" : ""
    }.`,
  );

  await AsyncStorage.setItem(SEED_FLAG_KEY, "done");

  return {
    seeded: true,
    message:
      "Demo data loaded: 4 users, 5 reports, spam votes for the flagged queue, 1 suspension.",
  };
}
