import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export interface MobileProblemItem {
  id: string;
  title: string;
  language: "python" | "cpp" | "csharp" | "java" | "javascript" | "sql";
  level: number;
  tier: "easy" | "intermediate" | "hard";
  tags: string[];
  description: string;
}

// Problem bank subset for mobile client preview
const MOBILE_PROBLEMS: MobileProblemItem[] = [
  {
    id: "py-sum-two-numbers",
    title: "Sum Two Numbers",
    language: "python",
    level: 1,
    tier: "easy",
    tags: ["math", "basics"],
    description: "Write a function add(a, b) that returns the sum of two integers.",
  },
  {
    id: "py-reverse-string",
    title: "Reverse a String",
    language: "python",
    level: 2,
    tier: "easy",
    tags: ["strings", "basics"],
    description: "Write a function reverse_string(s) that returns the reverse of a string.",
  },
  {
    id: "cpp-even-odd",
    title: "Even or Odd",
    language: "cpp",
    level: 3,
    tier: "easy",
    tags: ["conditionals", "math"],
    description: "Write a function checkEvenOdd(int n) that returns Even or Odd.",
  },
  {
    id: "cs-count-char",
    title: "Count Character Occurrences",
    language: "csharp",
    level: 5,
    tier: "easy",
    tags: ["strings", "loops"],
    description: "Count the number of times character c appears in string s.",
  },
  {
    id: "java-fibonacci",
    title: "Fibonacci Sequence",
    language: "java",
    level: 7,
    tier: "easy",
    tags: ["loops", "math"],
    description: "Print the first n terms of the Fibonacci sequence.",
  },
  {
    id: "js-filter-array",
    title: "Filter Array Above Threshold",
    language: "javascript",
    level: 9,
    tier: "easy",
    tags: ["arrays", "filtering"],
    description: "Return only the numbers greater than the threshold.",
  },
  {
    id: "sql-select-where",
    title: "SELECT with WHERE Clause",
    language: "sql",
    level: 10,
    tier: "easy",
    tags: ["sql", "select"],
    description: "Select name and grade of all students with grade > threshold.",
  },
  {
    id: "py-sieve-primes",
    title: "Sieve of Eratosthenes",
    language: "python",
    level: 11,
    tier: "intermediate",
    tags: ["math", "algorithms"],
    description: "Find all prime numbers up to n using the Sieve algorithm.",
  },
  {
    id: "java-factorial",
    title: "Recursive Factorial",
    language: "java",
    level: 17,
    tier: "intermediate",
    tags: ["recursion", "math"],
    description: "Write a recursive function that returns n!.",
  },
  {
    id: "py-n-queens",
    title: "N-Queens Problem",
    language: "python",
    level: 21,
    tier: "hard",
    tags: ["backtracking", "recursion"],
    description: "Find the number of distinct solutions to place n queens.",
  },
];

const LANGUAGES = ["all", "python", "cpp", "csharp", "java", "javascript", "sql"] as const;

interface CodeLabBrowserScreenProps {
  onSelectProblem?: (problem: MobileProblemItem) => void;
}

export function CodeLabBrowserScreen({ onSelectProblem }: CodeLabBrowserScreenProps) {
  const [search, setSearch] = useState("");
  const [selectedLang, setSelectedLang] = useState<string>("all");

  const filtered = MOBILE_PROBLEMS.filter((p) => {
    if (selectedLang !== "all" && p.language !== selectedLang) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)) ||
        String(p.level).includes(q)
      );
    }
    return true;
  });

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "easy":
        return "#10b981";
      case "intermediate":
        return "#f59e0b";
      case "hard":
        return "#f43f5e";
      default:
        return "#6366f1";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>CodeLab</Text>
        <Text style={styles.subtitle}>ICS Exclusive Problem Bank</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search problem or level..."
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Language Filter Chips */}
      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterList}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[
                styles.filterChip,
                selectedLang === lang && styles.filterChipActive,
              ]}
              onPress={() => setSelectedLang(lang)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedLang === lang && styles.filterTextActive,
                ]}
              >
                {lang.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Problem List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => {
          const tierColor = getTierColor(item.tier);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => onSelectProblem && onSelectProblem(item)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.badgeRow}>
                  <View style={styles.langBadge}>
                    <Text style={styles.langText}>{item.language.toUpperCase()}</Text>
                  </View>
                  <View style={[styles.tierBadge, { borderColor: tierColor }]}>
                    <Text style={[styles.tierText, { color: tierColor }]}>
                      LVL {item.level} · {item.tier.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.problemTitle}>{item.title}</Text>
              <Text style={styles.problemDesc} numberOfLines={2}>
                {item.description}
              </Text>

              <View style={styles.tagRow}>
                {item.tags.map((tag) => (
                  <View key={tag} style={styles.tagPill}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090d16",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#f8fafc",
  },
  subtitle: {
    fontSize: 13,
    color: "#6366f1",
    fontWeight: "600",
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginVertical: 8,
  },
  searchInput: {
    backgroundColor: "#131b2e",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#f8fafc",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  filterWrapper: {
    marginVertical: 6,
  },
  filterList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#131b2e",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  filterChipActive: {
    backgroundColor: "#4f46e5",
    borderColor: "#6366f1",
  },
  filterText: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "700",
  },
  filterTextActive: {
    color: "#ffffff",
  },
  listContainer: {
    padding: 20,
    gap: 12,
  },
  card: {
    backgroundColor: "#0f172a",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  langBadge: {
    backgroundColor: "#1e1b4b",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  langText: {
    color: "#818cf8",
    fontSize: 10,
    fontWeight: "800",
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  tierText: {
    fontSize: 10,
    fontWeight: "800",
  },
  problemTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f1f5f9",
  },
  problemDesc: {
    fontSize: 12,
    color: "#94a3b8",
    lineHeight: 18,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  tagPill: {
    backgroundColor: "#020617",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    color: "#64748b",
  },
});
