export type ProjectCatalogEntry = {
  id: string;
  name: string;
  location: string;
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripProjectPrefix(name: string): string {
  return name.replace(/^مشروع\s+/i, "").trim();
}

function scoreProject(project: ProjectCatalogEntry, text: string): number {
  if (!text) return 0;

  const haystack = normalize(text);
  const nameCore = normalize(stripProjectPrefix(project.name));
  const location = normalize(project.location);
  let score = 0;

  if (nameCore.length >= 2 && haystack.includes(nameCore)) {
    score += 12;
  }

  if (location.length >= 2 && haystack.includes(location)) {
    score += 8;
  }

  for (const token of nameCore.split(/\s+/).filter((word) => word.length > 2)) {
    if (haystack.includes(token)) {
      score += 4;
    }
  }

  for (const token of location.split(/\s+/).filter((word) => word.length > 2)) {
    if (haystack.includes(token)) {
      score += 2;
    }
  }

  const latinAliases: Array<{ needles: string[]; boost: number }> = [
    { needles: ["jura", "جورا"], boost: 10 },
    { needles: ["jamila", "جميلة"], boost: 10 },
    { needles: ["green avenue", "green", "avenue", "جرين", "أفينيو"], boost: 10 },
    { needles: ["galala", "جلالة", "سخنة"], boost: 10 },
  ];

  for (const alias of latinAliases) {
    const projectHay = `${nameCore} ${location}`;
    const aliasMatchesProject = alias.needles.some((needle) =>
      projectHay.includes(normalize(needle))
    );
    if (!aliasMatchesProject) continue;

    if (alias.needles.some((needle) => haystack.includes(normalize(needle)))) {
      score += alias.boost;
    }
  }

  return score;
}

export function resolveProjectId(
  projects: ProjectCatalogEntry[],
  options: {
    aiProjectId?: string | null;
    projectNameHint?: string | null;
    fileName?: string | null;
  }
): { projectId: string | null; projectName: string | null } {
  if (!projects.length) {
    return { projectId: null, projectName: null };
  }

  const aiId = options.aiProjectId?.trim();
  if (aiId && projects.some((project) => project.id === aiId)) {
    const matched = projects.find((project) => project.id === aiId)!;
    return { projectId: matched.id, projectName: matched.name };
  }

  const hintText = [options.projectNameHint, options.fileName].filter(Boolean).join(" ");
  if (!hintText.trim()) {
    return { projectId: null, projectName: null };
  }

  let best: ProjectCatalogEntry | null = null;
  let bestScore = 0;

  for (const project of projects) {
    const score = scoreProject(project, hintText);
    if (score > bestScore) {
      bestScore = score;
      best = project;
    }
  }

  if (best && bestScore >= 4) {
    return { projectId: best.id, projectName: best.name };
  }

  return { projectId: null, projectName: null };
}
