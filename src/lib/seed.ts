import type { Row } from "./backend";

/* ------------------------------------------------------------------ */
/* PLATFORM SETTINGS (settings collection, keyed documents)            */
/* ------------------------------------------------------------------ */
export const DEFAULT_SETTINGS: Record<string, any> = {
  siteName: "FLOW & BARS",
  tagline: "Georgian Battle Rap League",
  /** Secret control-center route. Changeable in System → Security. */
  adminPath: "fb-control-x92k",
  maintenanceMode: false,
  registrationOpen: true,
  /** Phone/SMS verification is permanently disabled on this platform. */
  authMethods: { password: true, google: true, facebook: true, phone: false },
  security: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
    baseLockMs: 60 * 1000,
    sessionLifetimeDays: 30,
    requireStrongPassword: true,
    logFailedAttempts: true,
  },
  rateLimits: { chatPerMin: 10, commentsPerMin: 5, signupPerHour: 3 },
  email: { provider: "firebase-auth", from: "no-reply@flowbars.ge", enabled: false },
  integrations: {
    youtubeChannel: "https://www.youtube.com/@FLOW-BARS",
    youtubeApiKey: "",
    instagram: "",
    tiktok: "",
    facebookAppId: "",
    googleClientId: "",
  },
  api: { publicReadEnabled: true, pageSize: 50 },
  seo: { title: "FLOW & BARS — Georgian Battle Rap League", description: "Official battles, rankings, roster and community." },
  ownerBootstrap: true,
};

/* ------------------------------------------------------------------ */
/* DESIGN MODE — published site configuration                          */
/* ------------------------------------------------------------------ */
export interface SectionDef {
  id: string;
  label: string;
  enabled: boolean;
  order: number;
  note?: string;
}

export interface DesignConfig {
  tokens: {
    accent: string;
    accent2: string;
    ink: string;
    surface: string;
    surface2: string;
    line: string;
    text: string;
    muted: string;
    radius: number;
    radiusLg: number;
    space: number;
    borderW: number;
    shadow: number;
    anim: number;
    grain: number;
    fontDisplay: string;
    fontBody: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    accentWord: string;
    subtitle: string;
    primaryLabel: string;
    secondaryLabel: string;
    image: string;
  };
  sections: SectionDef[];
  nav: { id: string; label: string; route: string; enabled: boolean }[];
  footer: {
    blurb: string;
    columns: { title: string; links: { label: string; href: string }[] }[];
    copyright: string;
    socials: { label: string; href: string }[];
  };
  components: {
    cardStyle: "solid" | "outline" | "glass";
    buttonStyle: "sharp" | "rounded" | "pill";
    marquee: boolean;
    gridOverlay: boolean;
    noise: boolean;
    revealOnScroll: boolean;
    imageTreatment: "none" | "mono" | "duotone";
  };
  version: number;
  updatedAt: number;
  channel: string;
}

export const DEFAULT_DESIGN: Omit<DesignConfig, "version" | "updatedAt" | "channel"> = {
  tokens: {
    accent: "#e10600",
    accent2: "#ffb703",
    ink: "#07070a",
    surface: "#0e0e13",
    surface2: "#15151d",
    line: "#24242e",
    text: "#f4f4f6",
    muted: "#8b8b98",
    radius: 4,
    radiusLg: 10,
    space: 1,
    borderW: 1,
    shadow: 0.9,
    anim: 1,
    grain: 0.06,
    fontDisplay: "'Anton', sans-serif",
    fontBody: "'Archivo', sans-serif",
  },
  hero: {
    eyebrow: "SEASON 5 · LIVE NOW",
    title: "THE LOUDEST ROOM IN TBILISI",
    accentWord: "BARS",
    subtitle:
      "Official matchups, judged decisions, league rankings and the only battle-rap community room in Georgia. No filler — just rounds.",
    primaryLabel: "WATCH BATTLES",
    secondaryLabel: "SEE THE LADDER",
    image: "https://images.pexels.com/photos/3101522/pexels-photo-3101522.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1600",
  },
  sections: [
    { id: "ticker", label: "Live ticker", enabled: true, order: 1 },
    { id: "stats", label: "League counters", enabled: true, order: 2 },
    { id: "leaders", label: "Top 3 leaders", enabled: true, order: 3 },
    { id: "battles", label: "Latest battles", enabled: true, order: 4 },
    { id: "events", label: "Upcoming events", enabled: true, order: 5 },
    { id: "news", label: "News strip", enabled: true, order: 6 },
    { id: "community", label: "Community room", enabled: true, order: 7 },
    { id: "cta", label: "Closing CTA", enabled: true, order: 8 },
  ],
  nav: [
    { id: "n1", label: "Battles", route: "battles", enabled: true },
    { id: "n2", label: "Rankings", route: "rankings", enabled: true },
    { id: "n3", label: "MCs", route: "mcs", enabled: true },
    { id: "n4", label: "News", route: "news", enabled: true },
    { id: "n5", label: "Community", route: "community", enabled: true },
  ],
  footer: {
    blurb: "Independent Georgian battle rap league. Filmed in Tbilisi, judged by the panel, decided on the night.",
    columns: [
      {
        title: "League",
        links: [
          { label: "Battle vault", href: "#/battles" },
          { label: "Rankings", href: "#/rankings" },
          { label: "MC roster", href: "#/mcs" },
        ],
      },
      {
        title: "Watch",
        links: [
          { label: "YouTube channel", href: "https://www.youtube.com/@FLOW-BARS" },
          { label: "Latest event", href: "#/battles" },
        ],
      },
    ],
    copyright: "© 2026 FLOW & BARS LEAGUE",
    socials: [{ label: "YouTube", href: "https://www.youtube.com/@FLOW-BARS" }],
  },
  components: {
    cardStyle: "solid",
    buttonStyle: "sharp",
    marquee: true,
    gridOverlay: true,
    noise: true,
    revealOnScroll: true,
    imageTreatment: "duotone",
  },
};

/* ------------------------------------------------------------------ */
/* SEED CONTENT — real league records (users/chat/comments are NOT     */
/* seeded: those collections only ever contain genuine activity)       */
/* ------------------------------------------------------------------ */
const IMG = {
  b1: "https://images.pexels.com/photos/10063141/pexels-photo-10063141.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  b2: "https://images.pexels.com/photos/10063279/pexels-photo-10063279.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  b3: "https://images.pexels.com/photos/17631013/pexels-photo-17631013.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  b4: "https://images.pexels.com/photos/10063145/pexels-photo-10063145.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  b5: "https://images.pexels.com/photos/25685862/pexels-photo-25685862.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  b6: "https://images.pexels.com/photos/11963121/pexels-photo-11963121.png?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  av1: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop",
  av2: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop",
  av3: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop",
  av4: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&h=300&fit=crop",
  av5: "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=300&h=300&fit=crop",
  av6: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=300&fit=crop",
};

export const DEFAULT_COVERS = {
  battles: IMG.b1,
  mcs: IMG.av1,
  news: IMG.b4,
  events: IMG.b2,
};

export const DEFAULT_CONTENT: Record<string, Partial<Row>[]> = {
  battles: [
    {
      id: "bat_nika_shota",
      title: "NIKA vs SHOTA",
      event: "MAIN EVENT 1",
      youtubeId: "L_LUpnjgPso",
      views: 124000,
      date: "2026-02-10",
      mc1: "NIKA",
      mc2: "SHOTA",
      score: "3 - 0",
      winner: "NIKA",
      status: "published",
      judges: ["BART", "D-CELL", "GIGA"],
      image: IMG.b1,
      description:
        "The title clash that shook the underground. Three rounds of escalating pressure, a flipped scheme in round two and a unanimous decision.",
    },
    {
      id: "bat_giorgi_luka",
      title: "GIORGI vs LUKA",
      event: "UNDERGROUND ROYALE 4",
      youtubeId: "L_LUpnjgPso",
      views: 88000,
      date: "2026-01-20",
      mc1: "GIORGI",
      mc2: "LUKA",
      score: "2 - 1",
      winner: "GIORGI",
      status: "published",
      judges: ["BART", "MAX", "NIKA"],
      image: IMG.b2,
      description: "Scheme-heavy technical battle. Deep personal jabs, heavy counters and a split decision that the room still argues about.",
    },
    {
      id: "bat_dato_iresa",
      title: "DATO vs IRESON",
      event: "ROYALE QUALIFIER",
      youtubeId: "",
      views: 41000,
      date: "2026-01-05",
      mc1: "DATO",
      mc2: "IRESON",
      score: "1 - 2",
      winner: "IRESON",
      status: "published",
      judges: ["GIGA", "MAX", "TOKA"],
      image: IMG.b3,
      description: "Qualifier energy — raw, unpolished and loud. IRESON took it on presence alone.",
    },
    {
      id: "bat_zura_beka",
      title: "ZURA vs BEKA",
      event: "SEASON 4 FINALE",
      youtubeId: "",
      views: 152000,
      date: "2025-12-18",
      mc1: "ZURA",
      mc2: "BEKA",
      score: "3 - 0",
      winner: "ZURA",
      status: "published",
      judges: ["BART", "D-CELL", "MAX"],
      image: IMG.b4,
      description: "Season four closed with a clean sweep and the loudest crowd reaction of the year.",
    },
  ],
  mcs: [
    { id: "mc_nika", name: "NIKA", rank: 1, wins: 12, losses: 1, draws: 0, streak: "5W", city: "Tbilisi", style: "Punchline / scheme", avatar: IMG.av1, bio: "Reigning champion. Brutal punchlines and layered rhyme schemes that land three rounds later." },
    { id: "mc_giorgi", name: "GIORGI", rank: 2, wins: 10, losses: 2, draws: 1, streak: "2W", city: "Kutaisi", style: "Technical / multis", avatar: IMG.av2, bio: "Technical wizard. Multisyllabic construction with theatrical aggression." },
    { id: "mc_shota", name: "SHOTA", rank: 3, wins: 9, losses: 4, draws: 0, streak: "1L", city: "Batumi", style: "Dark humour", avatar: IMG.av3, bio: "Crowd favourite. Unpredictable cadences and a mean streak of dark humour." },
    { id: "mc_zura", name: "ZURA", rank: 4, wins: 8, losses: 4, draws: 1, streak: "3W", city: "Rustavi", style: "Storytelling", avatar: IMG.av5, bio: "Narrative battler — builds a whole story then detonates it in the final eight bars." },
    { id: "mc_luka", name: "LUKA", rank: 5, wins: 7, losses: 5, draws: 1, streak: "1L", city: "Tbilisi", style: "Speed / street", avatar: IMG.av4, bio: "Relentless delivery, no breathing room, zero patience for setups." },
    { id: "mc_ireson", name: "IRESON", rank: 6, wins: 6, losses: 3, draws: 0, streak: "2W", city: "Gori", style: "Presence", avatar: IMG.av6, bio: "New blood from the qualifiers. Wins rounds on presence and timing." },
  ],
  news: [
    {
      id: "news_s5",
      title: "Season 5 is officially locked in",
      tag: "ANNOUNCEMENT",
      date: "2026-02-18",
      status: "published",
      featured: true,
      author: "League Office",
      summary: "International guest judges, a 10,000 GEL prize pool and sixteen qualified MCs. Registration opens next week.",
      content:
        "Flow & Bars Season 5 opens with a sixteen-MC bracket. Qualifiers run through March, quarter-finals in April, and the finale returns to the main hall in Tbilisi. Judging panel expanded to five with two international guests.",
    },
    {
      id: "news_nika",
      title: "NIKA: “I am not planning to lose it”",
      tag: "INTERVIEW",
      date: "2026-02-12",
      status: "published",
      featured: false,
      author: "F&B News",
      summary: "The #1 ranked champion talks title defence, the SHOTA rematch and why he trains rounds like fights.",
      content: "Full interview drops Friday on the official channel. Extracts published here after the premiere.",
    },
    {
      id: "news_panel",
      title: "Judging panel expanded to five members",
      tag: "LEAGUE",
      date: "2026-02-02",
      status: "published",
      featured: false,
      author: "League Office",
      summary: "From season five every decision is scored by five judges with a published criteria sheet.",
      content: "Criteria: scheme density, rebuttal accuracy, performance, crowd control, round construction. Scorecards go public 24h after each event.",
    },
  ],
  events: [
    { id: "ev_qual", title: "Season 5 Qualifiers — Night 1", date: "2026-03-07", venue: "Bassiani Annex, Tbilisi", status: "scheduled", capacity: 400 },
    { id: "ev_qual2", title: "Season 5 Qualifiers — Night 2", date: "2026-03-21", venue: "Bassiani Annex, Tbilisi", status: "scheduled", capacity: 400 },
    { id: "ev_qf", title: "Quarter Finals", date: "2026-04-18", venue: "Main Hall, Tbilisi", status: "draft", capacity: 900 },
  ],
  pages: [
    { id: "pg_rules", title: "League rules", slug: "rules", status: "published", body: "Three rounds. Ninety seconds each. No props, no backing tracks, no written-ins from the corner." },
    { id: "pg_about", title: "About the league", slug: "about", status: "published", body: "FLOW & BARS is an independent Georgian battle rap league founded in 2022." },
  ],
  categories: [
    { id: "cat_ann", name: "Announcement", slug: "announcement" },
    { id: "cat_int", name: "Interview", slug: "interview" },
    { id: "cat_lg", name: "League", slug: "league" },
  ],
  tags: [
    { id: "tag_s5", name: "Season 5", slug: "season-5" },
    { id: "tag_fin", name: "Finale", slug: "finale" },
    { id: "tag_jud", name: "Judging", slug: "judging" },
  ],
  media: [
    { id: "med_1", name: "Main event 1 — stage", url: IMG.b1, type: "image", size: "1200x627" },
    { id: "med_2", name: "Royale 4 — crowd", url: IMG.b4, type: "image", size: "1200x627" },
    { id: "med_3", name: "Finale — silhouette", url: IMG.b6, type: "image", size: "1200x627" },
  ],
};
