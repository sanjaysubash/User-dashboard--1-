import { PrismaClient, type Role } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

const PERMISSIONS_BY_ROLE: Record<string, string[]> = {
  super_admin: ["*"],
  first_level_manager: ["dashboard", "employees", "teams", "projects", "tasks", "attendance", "leave", "payroll", "performance", "kpi", "okr", "analytics", "reports", "settings", "my-work", "employee-profile"],
  second_level_manager: ["dashboard", "employees", "teams", "projects", "tasks", "attendance", "leave", "performance", "kpi", "okr", "analytics", "reports", "my-work", "employee-profile"],
  manager: ["dashboard", "employees", "teams", "projects", "tasks", "attendance", "leave", "performance", "my-work", "employee-profile", "knowledge"],
  team_lead: ["dashboard", "projects", "tasks", "attendance", "leave", "my-work", "employee-profile", "knowledge", "calendar", "meetings"],
  hr_admin: ["dashboard", "employees", "departments", "teams", "attendance", "leave", "payroll", "performance", "my-work", "employee-profile", "settings", "roles", "audit", "reports", "knowledge"],
  employee: ["dashboard", "my-work", "tasks", "attendance", "leave", "calendar", "meetings", "knowledge", "profile"],
};

const AVATAR_COLORS = ["bg-indigo-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-pink-500", "bg-teal-500", "bg-sky-500", "bg-fuchsia-500", "bg-orange-500", "bg-lime-600"];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function titleCase(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => (/^[A-Z](\.[A-Z])*\.?$/.test(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()))
    .join(" ");
}

// DOB format in source data is DD-MM-YYYY. Built as UTC midnight so the
// calendar date doesn't shift when read back via toISOString() in a UTC context.
function parseDob(s: string): Date {
  const [d, m, y] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

// Joining date format in source data is "DD Month YYYY" (month may be abbreviated, e.g. "Sep").
function parseJoiningDate(s: string): Date {
  const [dStr, monStr, yStr] = s.trim().split(/\s+/);
  const monthIdx = MONTHS.findIndex((m) => m.startsWith(monStr.toLowerCase()));
  return new Date(Date.UTC(Number(yStr), monthIdx, Number(dStr)));
}

type Row = {
  name: string;
  title: string;
  joiningDate?: string;
  phone?: string;
  email?: string;
  dob?: string;
  team?: "TECH" | "NON-TECH";
  role?: Role;
};

// Real Aaruchudar Technologies roster. Keep this in sync with the live Turso
// database — this is the single source of truth for both, not sample data.
const ROWS: Row[] = [
  { name: "AASHIKA N", title: "CEO", role: "super_admin", email: "aashika@aaruchudar.com" },
  { name: "VENKAT B", title: "Co-Founder", role: "super_admin", email: "venkat@aaruchudar.com" },
  { name: "SHIYAM SUNDAR G", title: "R&D Specialist - 2 & Data Analyst", joiningDate: "02 April 2025", phone: "7502009579", email: "shiyamsundarganesan@gmail.com", dob: "26-06-2005", team: "NON-TECH" },
  { name: "THIRUKUMARAN A", title: "R&D Specialist - 1", joiningDate: "25 April 2025", phone: "9698907196", email: "kumaranthiru2005@gmail.com", dob: "23-05-2005", team: "NON-TECH" },
  { name: "JAGADEESAN S", title: "Power BI", joiningDate: "30 April 2025", phone: "7871288747", email: "smartjaga18@gmail.com", dob: "31-10-2003", team: "TECH" },
  { name: "SHELSIA SHARON", title: "Train the Trainer", joiningDate: "28 May 2025", phone: "9361884771", email: "shelsiasharon12a@gmail.com", dob: "07-02-2005", team: "NON-TECH" },
  { name: "NIROSHINI A", title: "Train the Trainer", joiningDate: "28 May 2025", phone: "6374561066", email: "niroshiniak@gmail.com", dob: "27-04-2005", team: "NON-TECH" },
  { name: "KIRTHIGA J.S", title: "Train the Trainer", joiningDate: "28 May 2025", phone: "9789633117", email: "Kirthigajs123@gmail.com", dob: "23-01-2004", team: "NON-TECH" },
  { name: "SANJAY S", title: "Power BI Specialist", joiningDate: "28 May 2025", phone: "8680976152", email: "sanjaysubash038@gmail.com", dob: "16-08-2004", team: "TECH" },
  { name: "LALITHA KISHORE J", title: "Analytics & Research Associate - I", joiningDate: "28 May 2025", phone: "8438377149", email: "kishore02005@gmail.com", dob: "29-07-2005", team: "TECH" },
  { name: "ADITYA YADAV", title: "Software Developer - 1", joiningDate: "15 July 2025", phone: "9057516611", email: "adityayadav6661@gmail.com", dob: "28-04-2005", team: "TECH" },
  { name: "SHOURYA BODLA", title: "R&D Specialist - 1", joiningDate: "22 Sep 2025", phone: "8367029459", email: "shourya2539@gmail.com", dob: "15-01-2005", team: "NON-TECH" },
  { name: "PAVITHRA", title: "Social Media & Brand Strategists - Intern", joiningDate: "23 Dec 2025", phone: "7539985051", email: "pavianand1233@gmail.com", dob: "15-11-2006", team: "NON-TECH" },
  { name: "RISHABH MISHRA", title: "Web & App Developer - I", joiningDate: "15 July 2025", phone: "8349093152", email: "26rishabhmishra@gmail.com", dob: "18-02-2006", team: "TECH" },
  { name: "YANA WADHAVAN", title: "Product Manager", joiningDate: "05 Jan 2026", phone: "9996379793", email: "yanawadhawan12@gmail.com", dob: "12-12-2004", team: "TECH" },
  { name: "JYOTSNA PANDEY", title: "Neuroscientist", joiningDate: "28 April 2026", phone: "9650846471", email: "jpandey945@gmail.com", dob: "22-08-1997", team: "NON-TECH" },
];

const DEFAULT_PASSWORD = "Welcome@2026";

async function main() {
  console.log("Resetting database...");
  await prisma.session.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.payrollRecord.deleteMany();
  await prisma.operatingExpense.deleteMany();
  await prisma.performanceReview.deleteMany();
  await prisma.performanceCycle.deleteMany();
  await prisma.kPI.deleteMany();
  await prisma.keyResult.deleteMany();
  await prisma.objective.deleteMany();
  await prisma.knowledgeArticle.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLogEntry.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.eODReport.deleteMany();
  await prisma.employee.updateMany({ data: { managerId: null } });
  await prisma.department.updateMany({ data: { headId: null } });
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();

  console.log("Seeding role permissions...");
  for (const [role, perms] of Object.entries(PERMISSIONS_BY_ROLE)) {
    await prisma.rolePermission.createMany({ data: perms.map((permission) => ({ role: role as Role, permission })) });
  }

  console.log("Creating departments...");
  const tech = await prisma.department.create({ data: { name: "TECH", color: "bg-indigo-500" } });
  const nonTech = await prisma.department.create({ data: { name: "NON-TECH", color: "bg-emerald-500" } });
  const deptIdByTeam: Record<string, number> = { TECH: tech.id, "NON-TECH": nonTech.id };

  console.log("Creating employees...");
  let colorIdx = 0;
  for (const r of ROWS) {
    const name = titleCase(r.name);
    const role: Role = r.role ?? "employee";
    await prisma.employee.create({
      data: {
        name,
        email: r.email!,
        passwordHash: hashPassword(DEFAULT_PASSWORD),
        avatarInitials: initials(name),
        avatarColor: AVATAR_COLORS[colorIdx++ % AVATAR_COLORS.length],
        role,
        roleLabel: role === "super_admin" ? r.title : "Employee",
        title: r.title,
        phone: r.phone ?? null,
        dob: r.dob ? parseDob(r.dob) : null,
        departmentId: r.team ? deptIdByTeam[r.team] : null,
        permissions: JSON.stringify(PERMISSIONS_BY_ROLE[role]),
        joinedAt: r.joiningDate ? parseJoiningDate(r.joiningDate) : new Date(),
      },
    });
  }

  console.log("Creating leave types...");
  const LEAVE_TYPES = [
    { name: "Annual Leave", defaultDays: 12, color: "bg-indigo-500" },
    { name: "Sick Leave", defaultDays: 6, color: "bg-red-500" },
    { name: "Paid Leave", defaultDays: 6, color: "bg-amber-500" },
    { name: "Unpaid Leave", defaultDays: 15, color: "bg-slate-500" },
  ];
  for (const lt of LEAVE_TYPES) {
    await prisma.leaveType.create({ data: lt });
  }

  console.log("Creating holidays...");
  const HOLIDAYS = [
    { date: "2026-08-15", title: "Independence Day", description: "National holiday celebrating India's independence." },
    { date: "2026-09-04", title: "Milad-un-Nabi", description: "Islamic holiday commemorating the birthday of Prophet Muhammad." },
    { date: "2026-09-14", title: "Ganesh Chaturthi", description: "Hindu festival celebrating the birth of Lord Ganesha." },
    { date: "2026-10-02", title: "Gandhi Jayanti", description: "National holiday marking Mahatma Gandhi's birthday." },
    { date: "2026-10-19", title: "Naraka Chaturdashi", description: "Hindu festival marking the second day of Diwali celebrations." },
    { date: "2026-10-20", title: "Diwali", description: "Hindu festival of lights." },
    { date: "2026-10-28", title: "Bhai Dooj", description: "Hindu festival celebrating the bond between brothers and sisters." },
    { date: "2026-12-25", title: "Christmas", description: "Christian holiday celebrating the birth of Jesus Christ." },
  ];
  for (const h of HOLIDAYS) {
    await prisma.calendarEvent.create({
      data: { title: h.title, date: new Date(h.date), allDay: true, type: "holiday", color: "bg-rose-500", description: h.description },
    });
  }

  const count = await prisma.employee.count();
  console.log(`Done. Seeded ${count} employees across 2 departments. Default login password for all: "${DEFAULT_PASSWORD}"`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
