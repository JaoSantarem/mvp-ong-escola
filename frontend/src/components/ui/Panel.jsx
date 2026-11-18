import { CardAction } from "./CardAction.jsx";
import React from "react";

export function Panel({ title, children, hidden = false, onClick, actionLabel, icon }) {
  return (
    <section className={"panel" + (onClick ? " interactive-card" : "")} hidden={hidden}>
      <h2 className={icon ? "panel-title-with-icon" : undefined}>
        {icon}
        {title}
      </h2>
      {children}
      {onClick && <CardAction label={actionLabel || title} onClick={onClick} />}
    </section>
  );
}
