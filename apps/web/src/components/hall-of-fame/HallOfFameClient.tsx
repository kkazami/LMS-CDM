"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Bookmark,
  Briefcase,
  Building2,
  Compass,
  ExternalLink,
  RotateCcw,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import {
  ENTREPRENEUR_PROFILES,
  HALL_OF_FAME_PROFILES,
  HR_LEADER_PROFILES,
  filterHallOfFameProfiles,
  getNextProfileInCategory,
  getProfileById,
} from "@/lib/hall-of-fame/catalog";
import { ResponsiveSelect } from "@/components/ui/ResponsiveSelect";
import type {
  HallOfFameCategory,
  HallOfFameProfile,
  HallOfFameSubject,
  ProfileOrigin,
} from "@/lib/hall-of-fame/types";

interface HallOfFameClientProps {
  studentId: string;
  studentName: string;
  initialCategory?: HallOfFameCategory | null;
  initialProfileId?: string | null;
}

type ViewMode = "LANDING" | "CATEGORY" | "PROFILE";

/**
 * Wikipedia article titles for automatic live high-res portrait lookup
 * from the official Wikipedia REST API (`https://en.wikipedia.org/api/rest_v1/page/summary/...`),
 * paired with direct Wikimedia Commons / official portrait URLs.
 */
const WIKIPEDIA_PORTRAIT_SLUGS: Record<string, string> = {
  "tony-tan-caktiong": "Tony_Tan_Caktiong",
  "socorro-cancio-ramos": "Socorro_Ramos",
  "henry-sy-sr": "Henry_Sy",
  "john-gokongwei-jr": "John_Gokongwei",
  "mariano-que": "Mercury_Drug",
  "sara-blakely": "Sara_Blakely",
  "steve-jobs": "Steve_Jobs",
  "bill-gates": "Bill_Gates",
  "akio-morita": "Akio_Morita",
  "melanie-perkins": "Melanie_Perkins",
  "rosalinda-dimapilis-baldoz": "Rosalinda_Baldoz",
  "dave-ulrich": "Dave_Ulrich",
  "laszlo-bock": "Laszlo_Bock",
  "patty-mccord": "Patty_McCord",
  "edgar-schein": "Edgar_Schein",
  "amy-edmondson": "Amy_Edmondson",
};

/**
 * Direct verified Wikimedia Commons / official public portrait URLs where available.
 */
const DIRECT_PORTRAIT_URLS: Record<string, string> = {
  "steve-jobs": "/images/hall-of-fame/steve-jobs.jpg",
  "bill-gates": "/images/hall-of-fame/bill-gates.jpg",
  "akio-morita": "/images/hall-of-fame/akio-morita.jpg",
  "sara-blakely": "/images/hall-of-fame/sara-blakely.jpg",
  "melanie-perkins": "/images/hall-of-fame/melanie-perkins.jpg",
  "patty-mccord": "/images/hall-of-fame/patty-mccord.jpg",
  "socorro-cancio-ramos": "/images/hall-of-fame/socorro-cancio-ramos.jpg",
  "aurora-geotina-garcia": "/images/hall-of-fame/aurora-geotina-garcia.jpg",
  "mariano-que": "/images/hall-of-fame/mariano-que.jpg",
  "edgar-schein": "/images/hall-of-fame/edgar-schein.jpg",
  "ernesto-cecilia": "/images/hall-of-fame/ernesto-cecilia.jpg",
  "virgel-binghay": "/images/hall-of-fame/virgel-binghay.png",
  "jorge-sibal": "/images/hall-of-fame/jorge-sibal.png",
};

/**
 * Bespoke illustrated portrait metadata so every single leader has a realistic
 * human portrait illustration (never initials) if a photo is loading or unavailable.
 */
const ILLUSTRATED_LIKENESS: Record<
  string,
  {
    gender: "M" | "F";
    glasses?: boolean;
    hairStyle: "short" | "silver" | "parted" | "bun" | "long" | "bob" | "waves";
    hairColor: string;
    skinTone: string;
    suitColor: string;
    tieOrScarfColor: string;
  }
> = {
  "tony-tan-caktiong": {
    gender: "M",
    glasses: false,
    hairStyle: "parted",
    hairColor: "#1E293B",
    skinTone: "#F1C27D",
    suitColor: "#1E293B",
    tieOrScarfColor: "#DC2626",
  },
  "socorro-cancio-ramos": {
    gender: "F",
    glasses: true,
    hairStyle: "bun",
    hairColor: "#475569",
    skinTone: "#F1C27D",
    suitColor: "#991B1B",
    tieOrScarfColor: "#FDE68A",
  },
  "henry-sy-sr": {
    gender: "M",
    glasses: false,
    hairStyle: "silver",
    hairColor: "#94A3B8",
    skinTone: "#F1C27D",
    suitColor: "#0F172A",
    tieOrScarfColor: "#1D4ED8",
  },
  "john-gokongwei-jr": {
    gender: "M",
    glasses: true,
    hairStyle: "silver",
    hairColor: "#64748B",
    skinTone: "#F1C27D",
    suitColor: "#1E293B",
    tieOrScarfColor: "#047857",
  },
  "mariano-que": {
    gender: "M",
    glasses: true,
    hairStyle: "silver",
    hairColor: "#94A3B8",
    skinTone: "#F1C27D",
    suitColor: "#1E3A8A",
    tieOrScarfColor: "#0284C7",
  },
  "sara-blakely": {
    gender: "F",
    glasses: false,
    hairStyle: "long",
    hairColor: "#F59E0B",
    skinTone: "#FCD34D",
    suitColor: "#BE185D",
    tieOrScarfColor: "#FCE7F3",
  },
  "steve-jobs": {
    gender: "M",
    glasses: true,
    hairStyle: "short",
    hairColor: "#334155",
    skinTone: "#F3D2B3",
    suitColor: "#0F172A",
    tieOrScarfColor: "#0F172A",
  },
  "bill-gates": {
    gender: "M",
    glasses: true,
    hairStyle: "parted",
    hairColor: "#64748B",
    skinTone: "#F3D2B3",
    suitColor: "#1E3A8A",
    tieOrScarfColor: "#3B82F6",
  },
  "akio-morita": {
    gender: "M",
    glasses: false,
    hairStyle: "silver",
    hairColor: "#CBD5E1",
    skinTone: "#F1C27D",
    suitColor: "#1E293B",
    tieOrScarfColor: "#4338CA",
  },
  "melanie-perkins": {
    gender: "F",
    glasses: false,
    hairStyle: "long",
    hairColor: "#1E293B",
    skinTone: "#E0AC69",
    suitColor: "#4C1D95",
    tieOrScarfColor: "#A78BFA",
  },
  "rosalinda-dimapilis-baldoz": {
    gender: "F",
    glasses: true,
    hairStyle: "bob",
    hairColor: "#1E293B",
    skinTone: "#E0AC69",
    suitColor: "#0F766E",
    tieOrScarfColor: "#FDE68A",
  },
  "ernesto-cecilia": {
    gender: "M",
    glasses: true,
    hairStyle: "silver",
    hairColor: "#64748B",
    skinTone: "#E0AC69",
    suitColor: "#1E3A8A",
    tieOrScarfColor: "#F59E0B",
  },
  "jorge-sibal": {
    gender: "M",
    glasses: true,
    hairStyle: "silver",
    hairColor: "#475569",
    skinTone: "#E0AC69",
    suitColor: "#7F1D1D",
    tieOrScarfColor: "#FDE68A",
  },
  "virgel-binghay": {
    gender: "M",
    glasses: true,
    hairStyle: "parted",
    hairColor: "#1E293B",
    skinTone: "#E0AC69",
    suitColor: "#0C4A6E",
    tieOrScarfColor: "#38BDF8",
  },
  "aurora-geotina-garcia": {
    gender: "F",
    glasses: false,
    hairStyle: "bob",
    hairColor: "#334155",
    skinTone: "#F1C27D",
    suitColor: "#581C87",
    tieOrScarfColor: "#FDE68A",
  },
  "dave-ulrich": {
    gender: "M",
    glasses: true,
    hairStyle: "silver",
    hairColor: "#94A3B8",
    skinTone: "#F3D2B3",
    suitColor: "#1E3A8A",
    tieOrScarfColor: "#F59E0B",
  },
  "laszlo-bock": {
    gender: "M",
    glasses: false,
    hairStyle: "short",
    hairColor: "#1E293B",
    skinTone: "#F3D2B3",
    suitColor: "#065F46",
    tieOrScarfColor: "#34D399",
  },
  "patty-mccord": {
    gender: "F",
    glasses: true,
    hairStyle: "waves",
    hairColor: "#B45309",
    skinTone: "#F3D2B3",
    suitColor: "#991B1B",
    tieOrScarfColor: "#FCA5A5",
  },
  "edgar-schein": {
    gender: "M",
    glasses: true,
    hairStyle: "silver",
    hairColor: "#CBD5E1",
    skinTone: "#F3D2B3",
    suitColor: "#312E81",
    tieOrScarfColor: "#818CF8",
  },
  "amy-edmondson": {
    gender: "F",
    glasses: false,
    hairStyle: "waves",
    hairColor: "#D97706",
    skinTone: "#F3D2B3",
    suitColor: "#115E59",
    tieOrScarfColor: "#5EEAD4",
  },
};

// Shared in-memory cache of resolved Wikipedia thumbnail URLs
const resolvedPortraitCache = new Map<string, string>();

const CATEGORY_META: Record<
  HallOfFameCategory,
  {
    title: string;
    shortTitle: string;
    subtitle: string;
    badgeLabel: string;
    subjects: readonly HallOfFameSubject[];
  }
> = {
  ENTREPRENEUR: {
    title: "Entrepreneur Hall of Fame",
    shortTitle: "Entrepreneurs",
    subtitle:
      "Click on any entrepreneur's portrait below to explore why they are famous, their verified achievements, and career milestones timeline.",
    badgeLabel: "10 Profiles • 5 Filipino & 5 International",
    subjects: [
      "Entrepreneurship",
      "Managerial Accounting",
      "Personal Finance",
      "Income Taxation",
    ],
  },
  HR_LEADER: {
    title: "HR Leaders Hall of Fame",
    shortTitle: "HR Leaders",
    subtitle:
      "Click on any HR leader's portrait below to explore why they are famous, their verified achievements, and career milestones timeline.",
    badgeLabel: "10 Profiles • 5 Filipino & 5 International",
    subjects: [
      "Human Resources Management",
      "Recruitment and Selection",
      "Organizational Development",
    ],
  },
};

/**
 * Renders a realistic portrait photo (from Wikimedia/Wikipedia REST API)
 * layered over a detailed illustrated human portrait artwork (never text initials).
 */
function LeaderPortraitImage({
  profile,
  className = "w-full h-full",
}: {
  profile: HallOfFameProfile;
  className?: string;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    () =>
      profile.portraitUrl ??
      DIRECT_PORTRAIT_URLS[profile.id] ??
      resolvedPortraitCache.get(profile.id) ??
      null
  );
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (profile.portraitUrl || DIRECT_PORTRAIT_URLS[profile.id]) {
      setPhotoUrl(profile.portraitUrl ?? DIRECT_PORTRAIT_URLS[profile.id]);
      return;
    }
    if (resolvedPortraitCache.has(profile.id)) {
      setPhotoUrl(resolvedPortraitCache.get(profile.id)!);
      return;
    }

    const slug = WIKIPEDIA_PORTRAIT_SLUGS[profile.id];
    if (!slug) return;

    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const src: string | undefined =
          data?.originalimage?.source || data?.thumbnail?.source;
        if (src && isMounted) {
          resolvedPortraitCache.set(profile.id, src);
          setPhotoUrl(src);
          setPhotoFailed(false);
        }
      })
      .catch(() => {
        /* Keep illustrated portrait if offline or blocked */
      });

    return () => {
      isMounted = false;
    };
  }, [profile.id]);

  const likeness = ILLUSTRATED_LIKENESS[profile.id] ?? {
    gender: "M",
    glasses: false,
    hairStyle: "parted",
    hairColor: "#1E293B",
    skinTone: "#E0AC69",
    suitColor: "#0F172A",
    tieOrScarfColor: "#F59E0B",
  };

  const showRealPhoto = Boolean(photoUrl) && !photoFailed;

  return (
    <div className={`${className} relative overflow-hidden select-none bg-slate-900`}>
      {/* Bespoke Illustrated Human Portrait Layer (always rendered underneath so there is zero blank state or letter box) */}
      <svg
        viewBox="0 0 240 300"
        className="w-full h-full object-cover"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`bg-${profile.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={profile.portraitAccent.primary} />
            <stop offset="100%" stopColor={profile.portraitAccent.secondary} />
          </linearGradient>
          <radialGradient id={`glow-${profile.id}`} cx="50%" cy="35%" r="60%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
            <stop offset="100%" stopColor="rgba(15,23,42,0.4)" />
          </radialGradient>
        </defs>

        {/* Museum backdrop gradient + glow */}
        <rect width="240" height="300" fill={`url(#bg-${profile.id})`} />
        <rect width="240" height="300" fill={`url(#glow-${profile.id})`} />
        <circle cx="120" cy="115" r="78" fill="rgba(255,255,255,0.07)" />
        <circle
          cx="120"
          cy="115"
          r="64"
          fill="none"
          stroke="rgba(245,158,11,0.28)"
          strokeWidth="1.5"
        />

        {/* Back hair for long/bob/waves */}
        {likeness.hairStyle === "long" && (
          <path
            d="M68 100 C60 145, 62 195, 75 215 L165 215 C178 195, 180 145, 172 100 Z"
            fill={likeness.hairColor}
          />
        )}
        {(likeness.hairStyle === "bob" || likeness.hairStyle === "waves") && (
          <path
            d="M70 100 C63 135, 66 170, 80 182 L160 182 C174 170, 177 135, 170 100 Z"
            fill={likeness.hairColor}
          />
        )}
        {likeness.hairStyle === "bun" && (
          <circle cx="120" cy="52" r="22" fill={likeness.hairColor} />
        )}

        {/* Suit / Shoulders / Torso */}
        <path
          d="M28 300 C32 222, 72 196, 120 196 C168 196, 208 222, 212 300 Z"
          fill={likeness.suitColor}
        />

        {/* White dress shirt / blouse collar */}
        <polygon points="94,196 146,196 120,256" fill="#F8FAFC" />

        {/* Tie or Scarf / Lapel accent */}
        {likeness.gender === "M" ? (
          <>
            <polygon
              points="114,208 126,208 130,275 120,290 110,275"
              fill={likeness.tieOrScarfColor}
            />
            <path
              d="M92 196 L120 255 L104 265 L78 212 Z"
              fill="rgba(255,255,255,0.08)"
            />
            <path
              d="M148 196 L120 255 L136 265 L162 212 Z"
              fill="rgba(255,255,255,0.08)"
            />
          </>
        ) : (
          <>
            <path
              d="M88 202 Q120 228 152 202 L144 236 Q120 250 96 236 Z"
              fill={likeness.tieOrScarfColor}
            />
            {/* Pearl necklace accent */}
            <circle cx="104" cy="206" r="3" fill="#FFFBEB" />
            <circle cx="112" cy="210" r="3" fill="#FFFBEB" />
            <circle cx="120" cy="211" r="3" fill="#FFFBEB" />
            <circle cx="128" cy="210" r="3" fill="#FFFBEB" />
            <circle cx="136" cy="206" r="3" fill="#FFFBEB" />
          </>
        )}

        {/* Neck */}
        <rect
          x="103"
          y="162"
          width="34"
          height="42"
          rx="12"
          fill={likeness.skinTone}
        />
        <path
          d="M103 176 Q120 190 137 176 L137 195 L103 195 Z"
          fill="rgba(0,0,0,0.12)"
        />

        {/* Ears */}
        <ellipse cx="75" cy="122" rx="7" ry="12" fill={likeness.skinTone} />
        <ellipse cx="165" cy="122" rx="7" ry="12" fill={likeness.skinTone} />

        {/* Head / Face */}
        <path
          d="M76 102 C76 68, 164 68, 164 102 C164 148, 146 176, 120 176 C94 176, 76 148, 76 102 Z"
          fill={likeness.skinTone}
        />

        {/* Eyebrows */}
        <path
          d="M92 106 Q102 101 111 105"
          fill="none"
          stroke={likeness.hairColor}
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path
          d="M129 105 Q138 101 148 106"
          fill="none"
          stroke={likeness.hairColor}
          strokeWidth="2.8"
          strokeLinecap="round"
        />

        {/* Eyes */}
        <ellipse cx="102" cy="116" rx="5" ry="3.8" fill="#0F172A" />
        <ellipse cx="138" cy="116" rx="5" ry="3.8" fill="#0F172A" />
        <circle cx="103.5" cy="114.8" r="1.3" fill="#FFFFFF" />
        <circle cx="139.5" cy="114.8" r="1.3" fill="#FFFFFF" />

        {/* Optional Glasses */}
        {likeness.glasses && (
          <g stroke="#B45309" strokeWidth="2.4" fill="rgba(255,255,255,0.12)">
            <rect x="88" y="108" width="27" height="17" rx="4" />
            <rect x="125" y="108" width="27" height="17" rx="4" />
            <line x1="115" y1="115" x2="125" y2="115" />
            <line x1="76" y1="114" x2="88" y2="114" />
            <line x1="152" y1="114" x2="164" y2="114" />
          </g>
        )}

        {/* Nose */}
        <path
          d="M120 116 L117 135 Q120 138 124 135"
          fill="none"
          stroke="rgba(0,0,0,0.28)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Warm Confident Smile */}
        <path
          d="M106 148 Q120 158 134 148"
          fill="none"
          stroke={likeness.gender === "F" ? "#BE123C" : "#7C2D12"}
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Front Hair Crown */}
        <path
          d="M74 108 C72 70, 96 56, 120 56 C144 56, 168 70, 166 108 C158 86, 140 78, 118 80 C96 82, 82 90, 74 108 Z"
          fill={likeness.hairColor}
        />
      </svg>

      {/* Real Photograph Layer (when available) */}
      {showRealPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl!}
          alt={profile.fullName}
          loading="lazy"
          onError={() => setPhotoFailed(true)}
          className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-200 ease-out group-hover:scale-[1.03] motion-reduce:transform-none"
        />
      )}
    </div>
  );
}


/**
 * Interactive Portrait Card: Clicking the picture opens the full profile details.
 */
function ClickablePortraitCard({
  profile,
  isBookmarked,
  isExplored,
  onSelect,
  onToggleBookmark,
}: {
  profile: HallOfFameProfile;
  isBookmarked: boolean;
  isExplored: boolean;
  onSelect: () => void;
  onToggleBookmark: (e: React.MouseEvent) => void;
}) {
  const primaryAchievement = profile.majorAchievements[0];

  return (
    <article className="group relative rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] overflow-hidden flex flex-col justify-between shadow-xs hover:border-slate-300 dark:hover:border-white/25 transition-colors">
      {/* Bookmark Floating Button */}
      <button
        type="button"
        onClick={onToggleBookmark}
        aria-label={
          isBookmarked
            ? `Remove ${profile.fullName} from bookmarks`
            : `Bookmark ${profile.fullName}`
        }
        className={`absolute top-2.5 right-2.5 z-20 p-1.5 rounded-lg border transition cursor-pointer ${
          isBookmarked
            ? "bg-amber-500 text-slate-950 border-amber-400"
            : "bg-slate-950/75 text-white border-white/20 hover:bg-slate-950"
        }`}
      >
        <Bookmark className="w-3.5 h-3.5" />
      </button>

      {/* Clickable Portrait Picture Trigger */}
      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left flex-1 flex flex-col cursor-pointer"
      >
        {/* Portrait Frame */}
        <div className="relative aspect-[4/4.4] w-full overflow-hidden bg-slate-900 border-b-2 border-slate-200 dark:border-white/15">
          <LeaderPortraitImage profile={profile} className="w-full h-full" />

          {/* Top Origin Badge */}
          <div className="absolute top-2.5 left-2.5 right-10 z-10 flex flex-wrap items-center gap-1.5">
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                profile.origin === "FILIPINO"
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-900/90 text-sky-300 border border-sky-400/30"
              }`}
            >
              {profile.origin === "FILIPINO"
                ? "🇵🇭 Philippines"
                : `🌐 ${profile.countryLabel.replace(" (International)", "")}`}
            </span>
            {isExplored && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-semibold">
                Explored
              </span>
            )}
          </div>

          {/* Solid Bottom Nameplate Bar */}
          <div className="absolute inset-x-0 bottom-0 bg-slate-950/90 border-t border-white/10 py-2.5 px-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
              {profile.category === "ENTREPRENEUR" ? "Entrepreneur" : "HR Leader"}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-white leading-tight truncate">
              {profile.fullName}
            </h3>
            <p className="text-[11px] text-slate-300 truncate mt-0.5">
              {profile.organization}
            </p>
          </div>
        </div>

        {/* Concise Editorial Details Preview Below Portrait */}
        <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
              {profile.whyTheyMatterSummary}
            </p>
            {primaryAchievement && (
              <div className="rounded-lg bg-slate-50/70 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 px-2.5 py-2">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                  Key Achievement ({primaryAchievement.period})
                </span>
                <p className="text-[11px] font-semibold text-slate-900 dark:text-white line-clamp-1 mt-0.5">
                  {primaryAchievement.title}
                </p>
              </div>
            )}
          </div>

          <div className="pt-2.5 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
            <span>View Profile</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
          </div>
        </div>
      </button>
    </article>
  );
}

export default function HallOfFameClient({
  studentId,
  studentName,
  initialCategory = null,
  initialProfileId = null,
}: HallOfFameClientProps) {
  const initialProfile = initialProfileId
    ? getProfileById(initialProfileId) ?? null
    : null;

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (initialProfile) return "PROFILE";
    if (initialCategory) return "CATEGORY";
    return "LANDING";
  });
  const [activeCategory, setActiveCategory] = useState<HallOfFameCategory>(
    initialProfile?.category ?? initialCategory ?? "ENTREPRENEUR"
  );
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    initialProfile?.id ?? null
  );
  const [previousView, setPreviousView] = useState<"LANDING" | "CATEGORY">(
    initialCategory ? "CATEGORY" : "LANDING"
  );

  // Category search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [originFilter, setOriginFilter] = useState<ProfileOrigin | "ALL">("ALL");
  const [subjectFilter, setSubjectFilter] = useState<HallOfFameSubject | "ALL">("ALL");
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);

  // Student-scoped lightweight progress and bookmarks
  const [exploredIds, setExploredIds] = useState<string[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);

  const storagePrefix = `mp_lms_ibe_hof_${studentId}`;

  useEffect(() => {
    try {
      const savedExplored = localStorage.getItem(`${storagePrefix}_explored`);
      const savedBookmarks = localStorage.getItem(`${storagePrefix}_bookmarks`);
      if (savedExplored) setExploredIds(JSON.parse(savedExplored));
      if (savedBookmarks) setBookmarkedIds(JSON.parse(savedBookmarks));
    } catch {
      /* ignore */
    }
  }, [storagePrefix]);

  function markProfileExplored(profileId: string) {
    setExploredIds((prev) => {
      if (prev.includes(profileId)) return prev;
      const next = [...prev, profileId];
      try {
        localStorage.setItem(`${storagePrefix}_explored`, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function toggleBookmark(profileId: string) {
    setBookmarkedIds((prev) => {
      const next = prev.includes(profileId)
        ? prev.filter((id) => id !== profileId)
        : [...prev, profileId];
      try {
        localStorage.setItem(`${storagePrefix}_bookmarks`, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function openCategory(
    category: HallOfFameCategory,
    presetOrigin: ProfileOrigin | "ALL" = "ALL"
  ) {
    setActiveCategory(category);
    setOriginFilter(presetOrigin);
    setSubjectFilter("ALL");
    setSearchQuery("");
    setOnlyBookmarked(false);
    setViewMode("CATEGORY");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openProfile(profile: HallOfFameProfile, fromView: "LANDING" | "CATEGORY") {
    setPreviousView(fromView);
    setActiveCategory(profile.category);
    setSelectedProfileId(profile.id);
    setViewMode("PROFILE");
    markProfileExplored(profile.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetCategoryFilters() {
    setSearchQuery("");
    setOriginFilter("ALL");
    setSubjectFilter("ALL");
    setOnlyBookmarked(false);
  }

  const activeProfile = useMemo(
    () => (selectedProfileId ? getProfileById(selectedProfileId) ?? null : null),
    [selectedProfileId]
  );

  const categoryProfiles = useMemo(() => {
    const base = filterHallOfFameProfiles({
      category: activeCategory,
      origin: originFilter,
      subject: subjectFilter,
      search: searchQuery,
    });
    if (!onlyBookmarked) return base;
    return base.filter((p) => bookmarkedIds.includes(p.id));
  }, [activeCategory, originFilter, subjectFilter, searchQuery, onlyBookmarked, bookmarkedIds]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    originFilter !== "ALL" ||
    subjectFilter !== "ALL" ||
    onlyBookmarked;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 text-slate-900 dark:text-slate-100">
      {/* Compact Header + Flat Stat Strip */}
      <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                IBE Hall of Fame
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                20 Curated Biographies
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Welcome, <span className="font-semibold text-slate-800 dark:text-slate-200">{studentName}</span>. Explore 10 Entrepreneur Founders and 10 HR Leaders across the Philippines and the world. Click any portrait to study their biography, major achievements, and career timeline.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openCategory("ENTREPRENEUR")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E2B] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Briefcase className="w-3.5 h-3.5 text-amber-500" />
              Entrepreneurs ({ENTREPRENEUR_PROFILES.length})
            </button>
            <button
              type="button"
              onClick={() => openCategory("HR_LEADER")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#D97706] hover:bg-amber-700 text-white transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              HR Leaders ({HR_LEADER_PROFILES.length})
            </button>
          </div>
        </div>

        {/* Flat 3-Column Stat Strip */}
        <div className="grid grid-cols-3 divide-x-2 border-t-2 border-slate-200 dark:border-white/15 divide-slate-200 dark:divide-white/15 bg-slate-50/70 dark:bg-[#10131B]">
          <div className="px-4 py-3 sm:px-6">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Total Leaders
            </div>
            <div className="mt-0.5 text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white">
              {HALL_OF_FAME_PROFILES.length}
            </div>
          </div>
          <div className="px-4 py-3 sm:px-6">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Profiles Explored
            </div>
            <div className="mt-0.5 text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white">
              {exploredIds.length}{" "}
              <span className="text-xs font-normal text-slate-400">
                / {HALL_OF_FAME_PROFILES.length}
              </span>
            </div>
          </div>
          <div className="px-4 py-3 sm:px-6">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Bookmarked
            </div>
            <div className="mt-0.5 text-lg sm:text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {bookmarkedIds.length}
            </div>
          </div>
        </div>
      </div>

      {/* Clean Underline Tabs */}
      <nav
        aria-label="Hall of Fame Navigation"
        className="border-b-2 border-slate-200 dark:border-white/15 flex items-center gap-6 overflow-x-auto no-scrollbar"
      >
        <button
          type="button"
          onClick={() => setViewMode("LANDING")}
          className={`inline-flex items-center gap-2 py-3 text-xs sm:text-sm font-semibold border-b-2 -mb-0.5 whitespace-nowrap transition-colors cursor-pointer ${
            viewMode === "LANDING"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Portrait Gallery (20)</span>
        </button>

        <button
          type="button"
          onClick={() => openCategory("ENTREPRENEUR")}
          className={`inline-flex items-center gap-2 py-3 text-xs sm:text-sm font-semibold border-b-2 -mb-0.5 whitespace-nowrap transition-colors cursor-pointer ${
            viewMode === "CATEGORY" && activeCategory === "ENTREPRENEUR"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Entrepreneurs ({ENTREPRENEUR_PROFILES.length})</span>
        </button>

        <button
          type="button"
          onClick={() => openCategory("HR_LEADER")}
          className={`inline-flex items-center gap-2 py-3 text-xs sm:text-sm font-semibold border-b-2 -mb-0.5 whitespace-nowrap transition-colors cursor-pointer ${
            viewMode === "CATEGORY" && activeCategory === "HR_LEADER"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>HR Leaders ({HR_LEADER_PROFILES.length})</span>
        </button>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════════
          VIEW 1: HALL OF FAME PORTRAIT GALLERY LANDING PAGE
         ═══════════════════════════════════════════════════════════════════════ */}
      {viewMode === "LANDING" && (
        <div className="space-y-8">
          {/* 1. WING A: 10 ENTREPRENEURS PORTRAIT GALLERY */}
          <section aria-labelledby="entrepreneurs-gallery-heading" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Wing I • 5 Filipino & 5 International Founders
                </span>
                <h2
                  id="entrepreneurs-gallery-heading"
                  className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5"
                >
                  Entrepreneur Hall of Fame (10)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => openCategory("ENTREPRENEUR")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                <span>Search & Filter Entrepreneurs Wing</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {ENTREPRENEUR_PROFILES.map((profile) => (
                <ClickablePortraitCard
                  key={profile.id}
                  profile={profile}
                  isBookmarked={bookmarkedIds.includes(profile.id)}
                  isExplored={exploredIds.includes(profile.id)}
                  onSelect={() => openProfile(profile, "LANDING")}
                  onToggleBookmark={(e) => {
                    e.stopPropagation();
                    toggleBookmark(profile.id);
                  }}
                />
              ))}
            </div>
          </section>

          {/* 2. WING B: 10 HR LEADERS PORTRAIT GALLERY */}
          <section aria-labelledby="hr-leaders-gallery-heading" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Wing II • 5 Filipino & 5 International People Pioneers
                </span>
                <h2
                  id="hr-leaders-gallery-heading"
                  className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5"
                >
                  HR Leaders Hall of Fame (10)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => openCategory("HR_LEADER")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                <span>Search & Filter HR Leaders Wing</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {HR_LEADER_PROFILES.map((profile) => (
                <ClickablePortraitCard
                  key={profile.id}
                  profile={profile}
                  isBookmarked={bookmarkedIds.includes(profile.id)}
                  isExplored={exploredIds.includes(profile.id)}
                  onSelect={() => openProfile(profile, "LANDING")}
                  onToggleBookmark={(e) => {
                    e.stopPropagation();
                    toggleBookmark(profile.id);
                  }}
                />
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          VIEW 2: CATEGORY WING PAGE (ENTREPRENEURS OR HR LEADERS)
         ═══════════════════════════════════════════════════════════════════════ */}
      {viewMode === "CATEGORY" && (
        <div className="space-y-5">
          {/* Category Banner */}
          <section className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-amber-600 dark:text-amber-400 text-[11px] font-semibold uppercase tracking-wider">
                    {CATEGORY_META[activeCategory].badgeLabel}
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  {CATEGORY_META[activeCategory].title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {CATEGORY_META[activeCategory].subtitle}
                </p>
              </div>
            </div>
          </section>

          {/* Search & Filter Controls */}
          <section
            aria-label="Filter Hall of Fame Profiles"
            className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-4 sm:p-5 space-y-4 shadow-xs"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Search Input */}
              <div className="md:col-span-6 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, company, profession, or major achievement..."
                  aria-label="Search profiles by name, company, profession, or achievement"
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-[#10131B] border border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Origin Filter Pills */}
              <div className="md:col-span-4 flex items-center gap-1 bg-slate-50 dark:bg-[#10131B] p-1 rounded-lg border border-slate-200 dark:border-white/10">
                {(
                  [
                    { id: "ALL", label: "All (10)" },
                    { id: "FILIPINO", label: "Filipino (5)" },
                    { id: "INTERNATIONAL", label: "International (5)" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setOriginFilter(item.id)}
                    className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      originFilter === item.id
                        ? "bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Subject Filter Dropdown */}
              <div className="md:col-span-2">
                <ResponsiveSelect<HallOfFameSubject | "ALL">
                  ariaLabel="Filter by related IBE subject"
                  value={subjectFilter}
                  onChange={setSubjectFilter}
                  align="right"
                  options={[
                    { value: "ALL", label: "All Subjects" },
                    ...CATEGORY_META[activeCategory].subjects.map((subj) => ({
                      value: subj,
                      label: subj,
                    })),
                  ]}
                />
              </div>
            </div>

            {/* Active Count & Filter Reset Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-white/10 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-slate-600 dark:text-slate-400">
                  Showing{" "}
                  <strong className="font-mono text-slate-900 dark:text-white">
                    {categoryProfiles.length}
                  </strong>{" "}
                  of 10 portraits in {CATEGORY_META[activeCategory].title}
                </span>

                <button
                  type="button"
                  onClick={() => setOnlyBookmarked((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-semibold transition-colors cursor-pointer ${
                    onlyBookmarked
                      ? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300"
                      : "bg-slate-50 dark:bg-[#10131B] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Bookmarked Only</span>
                </button>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetCategoryFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>
          </section>

          {/* Clickable Portrait Cards Grid */}
          {categoryProfiles.length === 0 ? (
            <div className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-10 text-center space-y-3 shadow-xs">
              <Search className="w-7 h-7 text-amber-500 mx-auto" />
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  No profiles match your search or filter
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Try clearing your search term or switching the Filipino / International filter to view all 10 portraits in this wing.
                </p>
              </div>
              <button
                type="button"
                onClick={resetCategoryFilters}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D97706] hover:bg-amber-700 text-white font-semibold text-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Show All 10 Portraits</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {categoryProfiles.map((profile) => (
                <ClickablePortraitCard
                  key={profile.id}
                  profile={profile}
                  isBookmarked={bookmarkedIds.includes(profile.id)}
                  isExplored={exploredIds.includes(profile.id)}
                  onSelect={() => openProfile(profile, "CATEGORY")}
                  onToggleBookmark={(e) => {
                    e.stopPropagation();
                    toggleBookmark(profile.id);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          VIEW 3: DETAILED PROFILE EDITORIAL PAGE
         ═══════════════════════════════════════════════════════════════════════ */}
      {viewMode === "PROFILE" && activeProfile && (
        <article className="space-y-6">
          {/* Top Back & Next Profile Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() =>
                previousView === "CATEGORY"
                  ? setViewMode("CATEGORY")
                  : setViewMode("LANDING")
              }
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white dark:bg-[#141721] border-2 border-slate-200 dark:border-white/15 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>
                {previousView === "CATEGORY"
                  ? `Back to ${CATEGORY_META[activeProfile.category].title}`
                  : "Back to Portrait Gallery"}
              </span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleBookmark(activeProfile.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border-2 text-xs font-semibold transition-colors cursor-pointer ${
                  bookmarkedIds.includes(activeProfile.id)
                    ? "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300"
                    : "bg-white dark:bg-[#141721] border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-300"
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>
                  {bookmarkedIds.includes(activeProfile.id)
                    ? "Bookmarked"
                    : "Bookmark Profile"}
                </span>
              </button>

              {(() => {
                const nextProfile = getNextProfileInCategory(activeProfile);
                return (
                  <button
                    type="button"
                    onClick={() => openProfile(nextProfile, previousView)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <span>Next: {nextProfile.fullName}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                );
              })()}
            </div>
          </div>

          {/* ─── SECTION 1: PROFILE HEADER ─── */}
          <header className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="w-32 h-36 sm:w-36 sm:h-44 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-white/15 shrink-0">
                <LeaderPortraitImage
                  profile={activeProfile}
                  className="w-full h-full"
                />
              </div>

              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
                    {activeProfile.category === "ENTREPRENEUR"
                      ? "Entrepreneur Hall of Fame"
                      : "HR Leaders Hall of Fame"}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                    {activeProfile.countryLabel}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                  {activeProfile.fullName}
                </h1>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <Briefcase className="w-4 h-4 text-amber-500" />
                    {activeProfile.professionRole}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <Building2 className="w-4 h-4 text-amber-500" />
                    {activeProfile.organization}
                  </span>
                </div>

                {/* Historical vs Current/Final Positions Clearly Distinguished */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-white/10 text-xs">
                  <div className="rounded-lg bg-slate-50/70 dark:bg-[#10131B] p-3 border border-slate-200/80 dark:border-white/10">
                    <span className="font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
                      Current / Final Status
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {activeProfile.currentOrFinalStatus}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50/70 dark:bg-[#10131B] p-3 border border-slate-200/80 dark:border-white/10">
                    <span className="font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 block mb-1">
                      Historical Leadership Positions
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {activeProfile.historicalPositions}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Editorial Detail Sections */}
          <div className="space-y-6">
            {/* ─── SECTION 2: CAREER OVERVIEW ─── */}
            <section
              aria-labelledby="section-career-overview"
              className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-6 space-y-4 shadow-xs"
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <BookOpen className="w-4 h-4 text-amber-500" />
                <span>Section 2 • Career Overview & Turning Points</span>
              </div>
              <h2
                id="section-career-overview"
                className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white"
              >
                Career Overview
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                {activeProfile.shortBiography}
              </p>
              <div className="rounded-lg bg-slate-50/70 dark:bg-[#10131B] border border-slate-200/80 dark:border-white/10 p-4 space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Career Background & Crucial Turning Points
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {activeProfile.careerBackgroundAndTurningPoints}
                </p>
              </div>
            </section>

            {/* ─── SECTION 3: WHY THEY ARE FAMOUS ─── */}
            <section
              aria-labelledby="section-why-famous"
              className="rounded-xl border-2 border-amber-500/40 bg-white dark:bg-[#141721] p-6 space-y-3 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Section 3 • Signature Impact</span>
                </div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Verified Industry & Educational Influence
                </span>
              </div>

              <h2
                id="section-why-famous"
                className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white"
              >
                Why They Are Famous
              </h2>

              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                {activeProfile.whyFamous}
              </p>
            </section>

            {/* ─── SECTION 4: MAJOR ACHIEVEMENTS ─── */}
            <section
              aria-labelledby="section-major-achievements"
              className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-6 space-y-5 shadow-xs"
            >
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  <Award className="w-4 h-4" />
                  <span>Section 4 • Verified Accomplishments</span>
                </div>
                <h2
                  id="section-major-achievements"
                  className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1"
                >
                  Major Achievements
                </h2>
              </div>

              <div className="space-y-3">
                {activeProfile.majorAchievements.map((achievement, index) => (
                  <div
                    key={achievement.id}
                    className="rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] p-4 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        <span className="w-5 h-5 rounded-md bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-mono inline-flex items-center justify-center text-[11px]">
                          {index + 1}
                        </span>
                        <span>Achievement</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/10 text-xs font-mono font-semibold text-slate-700 dark:text-slate-200">
                        Period: {achievement.period}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      {achievement.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {achievement.explanation}
                    </p>

                    <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Source: {achievement.sourceLabel}
                      </span>
                      <a
                        href={achievement.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline shrink-0"
                      >
                        <span>Verify Source</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ─── SECTION 5: CAREER MILESTONES TIMELINE ─── */}
            <section
              aria-labelledby="section-career-milestones"
              className="rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] p-6 space-y-5 shadow-xs"
            >
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Section 5 • Chronological History
                </span>
                <h2
                  id="section-career-milestones"
                  className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1"
                >
                  Career Milestones
                </h2>
              </div>

              <ol className="relative border-s-2 border-slate-200 dark:border-white/15 ms-3 space-y-4">
                {activeProfile.careerMilestones.map((milestone, idx) => (
                  <li key={`${milestone.year}-${idx}`} className="ms-6">
                    <span className="absolute -inset-s-3 flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-mono text-[10px] font-bold">
                      {idx + 1}
                    </span>
                    <div className="rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#10131B] p-4 space-y-1">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono text-xs font-bold">
                        {milestone.year}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {milestone.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {milestone.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </article>
      )}
    </div>
  );
}
