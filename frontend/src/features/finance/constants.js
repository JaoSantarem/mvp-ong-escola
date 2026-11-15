export const initial = {
  type: "DONATION",
  description: "",
  source: "",
  projectId: "",
  workshopId: "",
  category: "",
  amount: "",
  date: "",
  reference: "",
  observation: "",
};

export const types = { DONATION: "Doação", EXPENSE: "Despesa", CASH_IN: "Entrada de caixa" };

export const statuses = {
  RECEIVED: "Recebida",
  PENDING: "Pendente",
  APPROVED: "Aprovada",
  REJECTED: "Recusada",
};

export const fields = {
  date: "Data",
  type: "Tipo",
  description: "Descrição",
  source: "Doador / origem",
  project: "Projeto",
  workshop: "Oficina",
  category: "Categoria",
  amount: "Valor",
  status: "Situação",
  reference: "Referência",
  observation: "Observação",
  approvedBy: "Aprovado / recusado por",
  attachments: "Anexos",
};
