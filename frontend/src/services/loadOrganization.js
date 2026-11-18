import { hasArea } from "../navigation/catalog.js";

export const emptyOrganization = {
  workshops: [],
  students: [],
  projects: [],
  expenses: [],
  instructors: [],
};

export async function loadOrganization(api) {
  const profile = await api("me");
  const day = hasArea(profile, "day");
  const management = hasArea(profile, "management");
  const [workshops, students, projects, ledger, summary, instructors] = await Promise.all([
    day ? api("workshops") : [],
    day ? api("students") : [],
    management ? api("projects") : [],
    management ? api("ledger") : [],
    day && management ? api("reports/summary") : null,
    day || management ? api("instructors") : [],
  ]);
  return {
    profile,
    summary,
    data: {
      workshops,
      students,
      projects,
      expenses: ledger.filter((row) => row.type === "EXPENSE"),
      instructors,
    },
  };
}
