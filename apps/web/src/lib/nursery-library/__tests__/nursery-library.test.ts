import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getAvailableSidebarToolsForIteProgram,
  getFeaturesForIteProgram,
} from "../../ite-programs/features";
import {
  getNurseryCategories,
  getNurseryItems,
  getNurseryLibraryData,
} from "../data";
import type { NurseryLibraryItem, Playlist } from "../types";
import {
  MAX_ITEMS_PER_PLAYLIST,
  MAX_PLAYLISTS,
  addToPlaylist,
  buildEmbedUrl,
  buildSearchUrl,
  createPlaylist,
  deletePlaylist,
  deserializePlaylists,
  filterItems,
  isValidYoutubeId,
  moveInPlaylist,
  removeFromPlaylist,
  renamePlaylist,
  sanitizePlaylistName,
  serializePlaylists,
} from "../rules";
import { evaluateNurseryLibraryAccess } from "../guard";

describe("Nursery Song & Educational Media Library - Registry Integration", () => {
  it("shows the library under the exact title 'Nursery Song & Educational Media Library' for BECEd only", () => {
    const becedFeatures = getFeaturesForIteProgram("BECEd");
    const library = becedFeatures.find(
      (f) => f.title === "Nursery Song & Educational Media Library"
    );
    assert.ok(library, "Expected Nursery Library in BECEd features");
    assert.equal(library.title, "Nursery Song & Educational Media Library");
    assert.equal(library.status, "available");
    assert.equal(library.href, "/ite/nursery-library");
    assert.deepEqual(library.programs, ["BECEd"]);

    // Excluded from other programs
    for (const prog of ["BEEd", "BTLEd ICT", "BSEd SCIENCE"] as const) {
      const features = getFeaturesForIteProgram(prog);
      const otherLib = features.find(
        (f) => f.title === "Nursery Song & Educational Media Library"
      );
      assert.equal(otherLib, undefined, `Must not appear in ${prog}`);
    }
  });

  it("exposes the library in BECEd sidebar tools and excludes other programs", () => {
    const becedTools = getAvailableSidebarToolsForIteProgram("BECEd");
    const libTool = becedTools.find(
      (t) => t.title === "Nursery Song & Educational Media Library"
    );
    assert.ok(libTool, "Expected library in BECEd sidebar tools");
    assert.equal(libTool.href, "/ite/nursery-library");

    for (const otherProg of ["BEEd", "BTLEd ICT", "BSEd SCIENCE"] as const) {
      const tools = getAvailableSidebarToolsForIteProgram(otherProg);
      assert.equal(
        tools.some((t) => t.title === "Nursery Song & Educational Media Library"),
        false,
        `Library must not appear in sidebar tools for ${otherProg}`
      );
    }

    assert.deepEqual(getAvailableSidebarToolsForIteProgram(null), []);
    assert.deepEqual(getAvailableSidebarToolsForIteProgram("BSCS"), []);
  });
});

describe("Nursery Song & Educational Media Library - Access Guard", () => {
  it("allows BECEd student in ITE institute route", async () => {
    const decision = await evaluateNurseryLibraryAccess({
      userId: "user-beced-1",
      userRole: "STUDENT",
      userInstituteCode: "ite",
      routeInstituteCode: "ite",
      resolveStudentProgram: async () => ({
        programCode: "BECEd",
        programName: "Bachelor of Early Childhood Education",
      }),
    });

    assert.equal(decision.allowed, true);
    assert.equal(decision.role, "STUDENT");
    assert.equal(decision.programCode, "BECEd");
  });

  it("rejects non-ITE route institute", async () => {
    const decision = await evaluateNurseryLibraryAccess({
      userId: "user-beced-1",
      userRole: "STUDENT",
      userInstituteCode: "ite",
      routeInstituteCode: "ics",
      resolveStudentProgram: async () => ({ programCode: "BECEd" }),
    });

    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, "NOT_ITE_ROUTE");
  });

  it("rejects non-ITE student user", async () => {
    const decision = await evaluateNurseryLibraryAccess({
      userId: "user-ics-1",
      userRole: "STUDENT",
      userInstituteCode: "ics",
      routeInstituteCode: "ite",
      resolveStudentProgram: async () => ({ programCode: "BECEd" }),
    });

    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, "NOT_ITE_USER");
  });

  it("rejects instructors and admins", async () => {
    for (const role of ["INSTRUCTOR", "ADMIN", "PROFESSOR", "TEACHER"]) {
      const decision = await evaluateNurseryLibraryAccess({
        userId: "user-staff-1",
        userRole: role,
        userInstituteCode: "ite",
        routeInstituteCode: "ite",
        resolveStudentProgram: async () => ({ programCode: "BECEd" }),
      });

      assert.equal(decision.allowed, false);
      assert.equal(decision.reason, "NOT_STUDENT");
    }
  });

  it("rejects students enrolled in other programs (BEEd, BTLEd ICT, BSEd SCIENCE)", async () => {
    for (const otherProgram of ["BEEd", "BTLEd ICT", "BSEd SCIENCE", null, "BSIT"]) {
      const decision = await evaluateNurseryLibraryAccess({
        userId: "user-student-other",
        userRole: "STUDENT",
        userInstituteCode: "ite",
        routeInstituteCode: "ite",
        resolveStudentProgram: async () => ({ programCode: otherProgram }),
      });

      assert.equal(decision.allowed, false);
      assert.equal(decision.reason, "NOT_BECED_PROGRAM");
    }
  });

  it("rejects invalid or unknown roles", async () => {
    const decision = await evaluateNurseryLibraryAccess({
      userId: "user-unknown",
      userRole: "GUEST",
      userInstituteCode: "ite",
      routeInstituteCode: "ite",
      resolveStudentProgram: async () => ({ programCode: "BECEd" }),
    });

    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, "INVALID_ROLE");
  });
});

describe("Nursery Song & Educational Media Library - Data Integrity", () => {
  it("data has categories and items arrays with unique IDs", () => {
    const data = getNurseryLibraryData();
    assert.ok(Array.isArray(data.categories));
    assert.ok(Array.isArray(data.items));

    const categoryIds = data.categories.map((c) => c.id);
    assert.equal(new Set(categoryIds).size, categoryIds.length);

    const itemIds = data.items.map((i) => i.id);
    assert.equal(new Set(itemIds).size, itemIds.length);
  });

  it("every item references an existing categoryId", () => {
    const categories = new Set(getNurseryCategories().map((c) => c.id));
    const items = getNurseryItems();

    for (const item of items) {
      assert.ok(
        categories.has(item.categoryId),
        `Item ${item.id} references non-existent category ${item.categoryId}`
      );
    }
  });

  it("languages and age ranges are strictly from allowed unions", () => {
    const validLanguages = new Set(["Filipino", "English"]);
    const validAges = new Set(["2-3", "3-4", "4-5", "5-6"]);
    const validTypes = new Set(["song", "rhyme", "lullaby", "educational-video"]);

    const items = getNurseryItems();
    for (const item of items) {
      assert.ok(validLanguages.has(item.language));
      assert.ok(validAges.has(item.ageRange));
      assert.ok(validTypes.has(item.type));
    }
  });

  it("all starter items have youtubeId as null", () => {
    const items = getNurseryItems();
    for (const item of items) {
      assert.equal(
        item.youtubeId,
        null,
        `Starter item ${item.id} must have youtubeId: null`
      );
    }
  });

  it("searchQuery is non-empty and contains no prohibited commercial brand names", () => {
    const blocklist = [
      "cocomelon",
      "pinkfong",
      "baby shark",
      "super simple",
      "little baby bum",
    ];

    const items = getNurseryItems();
    for (const item of items) {
      assert.ok(item.searchQuery && item.searchQuery.trim().length > 0);
      const lower = item.searchQuery.toLowerCase();
      for (const blocked of blocklist) {
        assert.equal(
          lower.includes(blocked),
          false,
          `Item ${item.id} searchQuery contains blocked brand "${blocked}"`
        );
      }
    }
  });

  it("regression: no item contains a field named 'lyrics'", () => {
    const items = getNurseryItems();
    for (const item of items) {
      assert.equal(
        "lyrics" in item,
        false,
        `Item ${item.id} must not contain a 'lyrics' property`
      );
    }
  });
});

describe("Nursery Song & Educational Media Library - Pure Logic & URLs", () => {
  it("isValidYoutubeId validates exactly 11-character base64-like IDs", () => {
    assert.equal(isValidYoutubeId("dQw4w9WgXcQ"), true);
    assert.equal(isValidYoutubeId("AbCdEf12345"), true);
    assert.equal(isValidYoutubeId("a_b-C123456"), true);

    // Rejections
    assert.equal(isValidYoutubeId("short"), false);
    assert.equal(isValidYoutubeId("toolong1234567"), false);
    assert.equal(isValidYoutubeId("spaces here"), false);
    assert.equal(isValidYoutubeId("with/slash!"), false);
    assert.equal(isValidYoutubeId('with"quote'), false);
    assert.equal(isValidYoutubeId("javascript:alert(1)"), false);
    assert.equal(isValidYoutubeId("https://youtube.com/watch?v=dQw4w9WgXcQ"), false);
    assert.equal(isValidYoutubeId(""), false);
    assert.equal(isValidYoutubeId(null), false);
    assert.equal(isValidYoutubeId(undefined), false);
  });

  it("buildEmbedUrl produces youtube-nocookie embed URL with rel=0 only for valid IDs", () => {
    assert.equal(
      buildEmbedUrl("dQw4w9WgXcQ"),
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0"
    );
    assert.equal(buildEmbedUrl("invalid-id"), null);
    assert.equal(buildEmbedUrl(null), null);
  });

  it("buildSearchUrl trims, sanitizes control characters, caps length, and encodes query", () => {
    const normal = buildSearchUrl("Bahay Kubo nursery rhyme for kids");
    assert.equal(
      normal,
      "https://www.youtube.com/results?search_query=Bahay%20Kubo%20nursery%20rhyme%20for%20kids"
    );

    // Injection attempts
    const injection = buildSearchUrl('Bahay & Kubo #1 "test" <script>');
    assert.ok(injection.startsWith("https://www.youtube.com/results?search_query="));
    assert.ok(injection.includes("%26")); // &
    assert.ok(injection.includes("%23")); // #
    assert.ok(injection.includes("%22")); // "
    assert.ok(injection.includes("%3Cscript%3E")); // <script>

    // Length capping at 120 chars
    const longString = "a".repeat(200);
    const longUrl = buildSearchUrl(longString);
    const queryPart = longUrl.split("search_query=")[1];
    assert.equal(decodeURIComponent(queryPart).length, 120);
  });

  it("filterItems filters by query, category, language, age, type, and favorites", () => {
    const items = getNurseryItems();

    // By category
    const filFolk = filterItems(items, { categoryId: "filipino-folk-songs" });
    assert.ok(filFolk.length > 0);
    for (const item of filFolk) {
      assert.equal(item.categoryId, "filipino-folk-songs");
    }

    // By language
    const englishOnly = filterItems(items, { language: "English" });
    for (const item of englishOnly) {
      assert.equal(item.language, "English");
    }

    // By type
    const lullabies = filterItems(items, { type: "lullaby" });
    assert.ok(lullabies.length >= 1);
    assert.equal(lullabies[0].id, "matulog-na-bunso");
    for (const item of lullabies) {
      assert.equal(item.type, "lullaby");
    }

    // By query matching learningFocus or title
    const searchStar = filterItems(items, { query: "Twinkle" });
    assert.equal(searchStar.length, 1);
    assert.equal(searchStar[0].id, "twinkle-twinkle-little-star");

    // By favorites
    const favResults = filterItems(items, {
      onlyFavorites: true,
      favoriteIds: ["bahay-kubo", "paruparong-bukid"],
    });
    assert.equal(favResults.length, 2);
  });
});

describe("Nursery Song & Educational Media Library - Playlist Helpers", () => {
  it("enforces playlist creation caps, sanitizes names, and handles renames", () => {
    let playlists: Playlist[] = [];

    // Create playlist
    const res1 = createPlaylist(" Morning Circle Songs \x00 ", playlists);
    assert.equal(res1.ok, true);
    if (res1.ok) {
      playlists = [res1.playlist];
      assert.equal(res1.playlist.name, "Morning Circle Songs");
    }

    // Rename
    playlists = renamePlaylist(playlists[0].id, "Circle Time Routines", playlists);
    assert.equal(playlists[0].name, "Circle Time Routines");

    // Enforce max 10 playlists cap
    for (let i = 2; i <= MAX_PLAYLISTS; i++) {
      const r = createPlaylist(`Playlist ${i}`, playlists);
      assert.equal(r.ok, true);
      if (r.ok) playlists.push(r.playlist);
    }
    assert.equal(playlists.length, 10);

    const exceed = createPlaylist("Exceeding Playlist", playlists);
    assert.equal(exceed.ok, false);
    if (!exceed.ok) {
      assert.ok(exceed.error.includes("limit of 10"));
    }
  });

  it("adds, removes, and reorders items in playlist (capped at 50)", () => {
    const plRes = createPlaylist("Test Sequence", []);
    assert.equal(plRes.ok, true);
    if (!plRes.ok) return;

    let playlists = [plRes.playlist];
    const plId = plRes.playlist.id;

    // Add items
    playlists = addToPlaylist(plId, "bahay-kubo", playlists);
    playlists = addToPlaylist(plId, "leron-leron-sinta", playlists);
    playlists = addToPlaylist(plId, "sitsiritsit", playlists);
    assert.deepEqual(playlists[0].itemIds, [
      "bahay-kubo",
      "leron-leron-sinta",
      "sitsiritsit",
    ]);

    // Avoid duplicate add
    playlists = addToPlaylist(plId, "bahay-kubo", playlists);
    assert.equal(playlists[0].itemIds.length, 3);

    // Move in playlist (reorder)
    playlists = moveInPlaylist(plId, "sitsiritsit", "up", playlists);
    assert.deepEqual(playlists[0].itemIds, [
      "bahay-kubo",
      "sitsiritsit",
      "leron-leron-sinta",
    ]);

    playlists = moveInPlaylist(plId, "bahay-kubo", "down", playlists);
    assert.deepEqual(playlists[0].itemIds, [
      "sitsiritsit",
      "bahay-kubo",
      "leron-leron-sinta",
    ]);

    // Remove from playlist
    playlists = removeFromPlaylist(plId, "bahay-kubo", playlists);
    assert.deepEqual(playlists[0].itemIds, [
      "sitsiritsit",
      "leron-leron-sinta",
    ]);

    // Delete playlist
    playlists = deletePlaylist(plId, playlists);
    assert.equal(playlists.length, 0);
  });

  it("serialization and deserialization ignores unknown versions and invalid item IDs", () => {
    const validIds = new Set(["item-1", "item-2"]);
    const sample: Playlist[] = [
      {
        id: "pl-1",
        name: "Valid Playlist",
        itemIds: ["item-1", "fake-item", "item-2"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const json = serializePlaylists(sample);
    const restored = deserializePlaylists(json, validIds);
    assert.equal(restored.length, 1);
    assert.deepEqual(restored[0].itemIds, ["item-1", "item-2"]); // fake-item was stripped

    // Unknown version returns empty array
    const unknownVersion = JSON.stringify({ version: 99, playlists: sample });
    assert.deepEqual(deserializePlaylists(unknownVersion, validIds), []);

    // Malformed JSON returns empty array
    assert.deepEqual(deserializePlaylists("not json", validIds), []);
  });
});

describe("Nursery Song & Educational Media Library - YouTube URL Parser & Storage", () => {
  const {
    parseYouTubeUrl,
    parseStartSeconds,
    sanitizeCustomTitle,
    sanitizeCustomNotes,
    serializeCustomVideos,
    deserializeCustomVideos,
    serializeAttachedVideos,
    deserializeAttachedVideos,
    MAX_CUSTOM_VIDEOS,
    MAX_CUSTOM_VIDEO_TITLE_LENGTH,
    MAX_CUSTOM_VIDEO_NOTES_LENGTH,
  } = require("../youtube");

  it("parses all accepted video URL shapes and extracts 11-char ID", () => {
    const validCases = [
      {
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        id: "dQw4w9WgXcQ",
      },
      {
        url: "http://youtube.com/watch?v=dQw4w9WgXcQ",
        id: "dQw4w9WgXcQ",
      },
      {
        url: "youtube.com/watch?v=dQw4w9WgXcQ",
        id: "dQw4w9WgXcQ",
      },
      {
        url: "https://youtu.be/dQw4w9WgXcQ",
        id: "dQw4w9WgXcQ",
      },
      {
        url: "youtu.be/dQw4w9WgXcQ",
        id: "dQw4w9WgXcQ",
      },
      {
        url: "https://www.youtube.com/shorts/dQw4w9WgXcQ",
        id: "dQw4w9WgXcQ",
      },
      {
        url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        id: "dQw4w9WgXcQ",
      },
      {
        url: "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
        id: "dQw4w9WgXcQ",
      },
      {
        url: "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
        id: "dQw4w9WgXcQ",
      },
      {
        url: "https://www.youtube-nocookie.com/watch?v=dQw4w9WgXcQ",
        id: "dQw4w9WgXcQ",
      },
      {
        url: "https://youtube.com/watch?v=dQw4w9WgXcQ&si=12345&feature=share",
        id: "dQw4w9WgXcQ",
      },
      {
        url: "HTTPS://WWW.YOUTUBE.COM/watch?v=dQw4w9WgXcQ",
        id: "dQw4w9WgXcQ",
      },
      {
        url: "https://YOUTUBE.COM/watch?v=dQw4w9WgXcQ/",
        id: "dQw4w9WgXcQ",
      },
      {
        url: "https://youtu.be/dQw4w9WgXcQ/",
        id: "dQw4w9WgXcQ",
      },
      {
        url: "https://youtube.com/shorts/dQw4w9WgXcQ/",
        id: "dQw4w9WgXcQ",
      },
    ];

    for (const { url, id } of validCases) {
      const res = parseYouTubeUrl(url);
      assert.ok(res, `Expected URL to parse: ${url}`);
      assert.equal(res.kind, "video");
      assert.equal(res.videoId, id);
      assert.ok(
        res.embedUrl.startsWith("https://www.youtube-nocookie.com/embed/"),
        `Embed URL must start with nocookie domain: ${res.embedUrl}`
      );
    }
  });

  it("parses start time from t= and start= query parameters", () => {
    assert.equal(parseStartSeconds("120"), 120);
    assert.equal(parseStartSeconds("90s"), 90);
    assert.equal(parseStartSeconds("1m30s"), 90);
    assert.equal(parseStartSeconds("1h2m3s"), 3723);
    assert.equal(parseStartSeconds("2h"), 7200);
    assert.equal(parseStartSeconds("45s"), 45);
    assert.equal(parseStartSeconds("0"), undefined);
    assert.equal(parseStartSeconds("invalid"), undefined);

    const withTime1 = parseYouTubeUrl("https://youtube.com/watch?v=dQw4w9WgXcQ&t=1h2m3s");
    assert.ok(withTime1);
    assert.equal(withTime1.kind, "video");
    assert.equal(withTime1.startSeconds, 3723);
    assert.ok(withTime1.embedUrl.includes("&start=3723"));

    const withTime2 = parseYouTubeUrl("https://youtu.be/dQw4w9WgXcQ?t=45s");
    assert.ok(withTime2);
    assert.equal(withTime2.kind, "video");
    assert.equal(withTime2.startSeconds, 45);
    assert.ok(withTime2.embedUrl.includes("&start=45"));
  });

  it("parses playlist-only links and builds videoseries embed URL", () => {
    const plUrl1 = "https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf";
    const res1 = parseYouTubeUrl(plUrl1);
    assert.ok(res1);
    assert.equal(res1.kind, "playlist");
    assert.equal(res1.playlistId, "PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf");
    assert.equal(
      res1.embedUrl,
      "https://www.youtube-nocookie.com/embed/videoseries?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf&rel=0&modestbranding=1&playsinline=1"
    );

    const plUrl2 = "https://m.youtube.com/playlist?list=UU1234567890abcdef";
    const res2 = parseYouTubeUrl(plUrl2);
    assert.ok(res2);
    assert.equal(res2.kind, "playlist");
    assert.equal(res2.playlistId, "UU1234567890abcdef");
  });

  it("rejects malicious, lookalike, and invalid URL formats", () => {
    const rejectCases = [
      "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ",
      "https://evilyoutube.com/watch?v=dQw4w9WgXcQ",
      "https://evil.com/watch?v=dQw4w9WgXcQ",
      "https://vimeo.com/123456789",
      "javascript:alert(1)",
      "javascript:void(0)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox",
      "https://youtube.com/watch?v=dQw4w9WgXc", // 10 chars
      "https://youtube.com/watch?v=dQw4w9WgXcQQ", // 12 chars
      "https://youtube.com/watch?v=dQw4w9WgXc!", // bad punctuation
      "https://youtube.com/watch?v=dQw4w9Wg Xc", // space in ID
      "https://youtube.com/channel/UC1234567890",
      "https://youtube.com/user/pewdiepie",
      "https://www.youtube.com/playlist?list=short", // playlist too short (<10)
      "",
      "   ",
      "not a url",
      "https://",
    ];

    for (const bad of rejectCases) {
      const res = parseYouTubeUrl(bad);
      assert.equal(res, null, `Should have rejected: ${bad}`);
    }
  });

  it("sanitizes video titles and notes", () => {
    assert.equal(sanitizeCustomTitle("  Hello \x00World\x1F!  "), "Hello World!");
    const longTitle = "A".repeat(120);
    assert.equal(sanitizeCustomTitle(longTitle).length, MAX_CUSTOM_VIDEO_TITLE_LENGTH);

    assert.equal(sanitizeCustomNotes("  Teaching \x07Tip\x1E  "), "Teaching Tip");
    const longNotes = "N".repeat(300);
    assert.equal(sanitizeCustomNotes(longNotes).length, MAX_CUSTOM_VIDEO_NOTES_LENGTH);
  });

  it("serializes and deserializes custom videos with dedupe, recovery, and 100 item cap", () => {
    const sampleVideos = [
      {
        id: "custom-1",
        title: "Song 1",
        youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        kind: "video" as const,
        videoId: "dQw4w9WgXcQ",
        playlistId: null,
        embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1&playsinline=1",
        canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // Duplicate video ID with different entry id (should be deduped on load)
      {
        id: "custom-duplicate",
        title: "Song 1 Dupe",
        youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
        kind: "video" as const,
        videoId: "dQw4w9WgXcQ",
        playlistId: null,
        embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1&playsinline=1",
        canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const json = serializeCustomVideos(sampleVideos);
    const restored = deserializeCustomVideos(json);
    assert.equal(restored.length, 1); // duplicate was dropped
    assert.equal(restored[0].videoId, "dQw4w9WgXcQ");

    // Corrupted JSON recovery
    assert.deepEqual(deserializeCustomVideos("not json at all"), []);
    assert.deepEqual(deserializeCustomVideos(null), []);
    assert.deepEqual(deserializeCustomVideos(JSON.stringify({ version: 999, videos: [] })), []);

    // 100 item cap enforcement
    const manyVideos = Array.from({ length: 120 }, (_, i) => ({
      id: `custom-${i}`,
      title: `Song ${i}`,
      youtubeUrl: `https://www.youtube.com/watch?v=video${String(i).padStart(6, "0")}`,
      kind: "video" as const,
      videoId: `video${String(i).padStart(6, "0")}`,
      playlistId: null,
      embedUrl: `https://www.youtube-nocookie.com/embed/video${String(i).padStart(6, "0")}?rel=0&modestbranding=1&playsinline=1`,
      canonicalUrl: `https://www.youtube.com/watch?v=video${String(i).padStart(6, "0")}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const cappedJson = serializeCustomVideos(manyVideos);
    const cappedRestored = deserializeCustomVideos(cappedJson);
    assert.equal(cappedRestored.length, MAX_CUSTOM_VIDEOS);
  });

  it("serializes and deserializes attached videos for curated songs", () => {
    const attachedMap = {
      "bahay-kubo": {
        youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        kind: "video" as const,
        videoId: "dQw4w9WgXcQ",
        playlistId: null,
        embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1&playsinline=1",
        canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        updatedAt: new Date().toISOString(),
      },
    };

    const json = serializeAttachedVideos(attachedMap);
    const restored = deserializeAttachedVideos(json);
    assert.ok(restored["bahay-kubo"]);
    assert.equal(restored["bahay-kubo"].videoId, "dQw4w9WgXcQ");

    // Corrupted fallback
    assert.deepEqual(deserializeAttachedVideos("{bad json"), {});
  });
});

