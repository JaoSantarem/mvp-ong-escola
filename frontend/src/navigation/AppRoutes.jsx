import React from "react";
import {
  Dashboard,
  WorkshopList,
  People,
  Team,
  Projects,
  Finance,
  Classroom,
} from "../pages/index.js";
import { ProjectDetails } from "../pages/ProjectDetailsPage.jsx";
import { firstPage } from "./catalog.js";

// Exemplos: "people", "classroom:5", "finance:summary:3".
export function AppRoutes({ page, context }) {
  const [module, section, projectId] = page.split(":");
  switch (module) {
    case "dashboard":
      return <Dashboard {...context} />;
    case "workshops":
      return <WorkshopList {...context} />;
    case "people":
      return <People {...context} />;
    case "projects":
      return <Projects {...context} />;
    case "project":
      return <ProjectDetails key={page} {...context} projectId={Number(section)} />;
    case "classroom":
      return <Classroom key={page} {...context} workshopId={Number(section)} />;
    case "team":
      return <Team {...context} section={section || "instructors"} />;
    case "finance":
      return <Finance {...context} section={section || "summary"} initialProject={projectId} />;
    case "no-access":
      return (
        <div className="empty-state">
          <b>Nenhuma área liberada</b>Solicite ao administrador acesso a Dia a Dia ou Gestão.
        </div>
      );
    default:
      return <AppRoutes page={firstPage(context.profile)} context={context} />;
  }
}
