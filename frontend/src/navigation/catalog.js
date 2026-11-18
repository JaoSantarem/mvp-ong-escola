export const categories = [
  {
    id: "operation",
    title: "Dia a Dia",
    items: [
      { page: "dashboard", title: "Visão geral", icon: "dashboard" },
      { page: "workshops", title: "Oficinas e turmas", icon: "workshops" },
      { page: "people", title: "Participantes", icon: "people" },
    ],
  },
  {
    id: "management",
    title: "Gestão",
    items: [
      { page: "projects", title: "Projetos", icon: "projects" },
      { page: "finance:summary", title: "Financeiro", icon: "finance" },
      { page: "team:instructors", title: "Equipe", icon: "team" },
    ],
  },
];
export function hasArea(profile, area) {
  if (!profile) return false;
  if (profile.role === "ADMIN") return true;
  return profile[area === "day" ? "dayToDayAccess" : "managementAccess"] !== false;
}
export function visibleCategories(profile) {
  return categories.filter((c) => hasArea(profile, c.id === "operation" ? "day" : "management"));
}
export function canAccessPage(page, profile) {
  const module = page.split(":")[0];
  if (module === "no-access") return !hasArea(profile, "day") && !hasArea(profile, "management");
  return hasArea(
    profile,
    ["dashboard", "workshops", "people", "classroom"].includes(module) ? "day" : "management",
  );
}
export function firstPage(profile) {
  return hasArea(profile, "day")
    ? "dashboard"
    : hasArea(profile, "management")
      ? "projects"
      : "no-access";
}
export function destination(page) {
  const module = page.split(":")[0];
  if (module === "classroom")
    return { category: "Dia a Dia", title: "Gestão da turma", page: "workshops" };
  if (module === "project")
    return { category: "Gestão", title: "Área do projeto", page: "projects" };
  for (const category of categories) {
    const item = category.items.find((item) => item.page.split(":")[0] === module);
    if (item) return { ...item, category: category.title };
  }
  return { category: "Organização", title: "Acesso", page: "no-access" };
}
