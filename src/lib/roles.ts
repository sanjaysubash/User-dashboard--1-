import { prisma } from "./prisma";

export const DB_TO_UI_ROLE: Record<string, string> = {
  super_admin: "super-admin",
  first_level_manager: "1st-level-manager",
  second_level_manager: "2nd-level-manager",
  manager: "manager",
  team_lead: "team-lead",
  hr_admin: "hr-admin",
  employee: "employee",
};

export const UI_TO_DB_ROLE: Record<string, string> = Object.fromEntries(
  Object.entries(DB_TO_UI_ROLE).map(([db, ui]) => [ui, db])
);

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  first_level_manager: "1st Level Manager",
  second_level_manager: "2nd Level Manager",
  manager: "Manager",
  team_lead: "Team Lead",
  hr_admin: "HR Admin",
  employee: "Employee",
};

export const ALL_ROLES = Object.keys(ROLE_LABELS);

export const ALL_PERMISSIONS = [
  "dashboard", "employees", "departments", "teams", "projects", "tasks", "attendance", "leave",
  "payroll", "performance", "kpi", "okr", "analytics", "reports", "settings", "my-work",
  "employee-profile", "knowledge", "calendar", "meetings", "roles", "audit", "profile", "eod",
];

export async function getPermissionsForRole(role: string): Promise<string[]> {
  const rows = await prisma.rolePermission.findMany({ where: { role: role as any } });
  if (rows.some((r) => r.permission === "*")) return ["*"];
  return rows.map((r) => r.permission);
}

type EmployeeWithDept = {
  id: number;
  name: string;
  email: string;
  avatarInitials: string;
  avatarColor: string;
  role: string;
  roleLabel: string;
  title: string;
  phone: string | null;
  location: string | null;
  department?: { name: string } | null;
};

export function toAuthUser(employee: EmployeeWithDept, permissions: string[]) {
  return {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    avatar: employee.avatarInitials,
    avatarColor: employee.avatarColor,
    role: DB_TO_UI_ROLE[employee.role] ?? employee.role,
    roleLabel: employee.roleLabel,
    dept: employee.department?.name ?? "",
    title: employee.title,
    phone: employee.phone ?? "",
    location: employee.location ?? "",
    permissions,
  };
}
