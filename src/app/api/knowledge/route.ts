import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();
  const category = searchParams.get("category")?.trim();

  const articles = await prisma.knowledgeArticle.findMany({
    where: {
      ...(category && category !== "All" ? { category } : {}),
      ...(search ? { title: { contains: search } } : {}),
    },
    include: { author: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    articles: articles.map((a) => ({
      id: a.id,
      title: a.title,
      category: a.category,
      author: a.author?.name ?? "Unknown",
      updated: a.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      views: a.views,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const title = body?.title?.trim();
  const category = body?.category?.trim();
  if (!title || !category) return NextResponse.json({ error: "Title and category are required." }, { status: 400 });

  const article = await prisma.knowledgeArticle.create({
    data: { title, category, content: body?.content || "", authorId: user.id },
  });

  await logAudit(user, `Published knowledge article "${title}"`, "Knowledge Base");

  return NextResponse.json({ article: { id: article.id, title: article.title } }, { status: 201 });
}
