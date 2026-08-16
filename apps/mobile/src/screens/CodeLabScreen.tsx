import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MobileProblemItem } from "./CodeLabBrowserScreen";

interface CodeLabScreenProps {
  problem: MobileProblemItem;
  onBack?: () => void;
}

interface TestResultDisplay {
  caseIndex: number;
  passed: boolean;
  actual?: string;
  expected?: string;
}

export function CodeLabScreen({ problem, onBack }: CodeLabScreenProps) {
  const [code, setCode] = useState<string>(
    `# Write your ${problem.language} solution below\ndef solution():\n    pass\n`
  );
  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState<TestResultDisplay[]>([]);
  const [score, setScore] = useState<number | null>(null);

  const handleRunOrSubmit = async () => {
    setIsExecuting(true);
    // Simulate remote Judge0 submission
    setTimeout(() => {
      setIsExecuting(false);
      const mockResults: TestResultDisplay[] = [
        { caseIndex: 1, passed: true, actual: "8", expected: "8" },
        { caseIndex: 2, passed: true, actual: "12", expected: "12" },
        { caseIndex: 3, passed: false, actual: "0", expected: "20" },
      ];
      setResults(mockResults);
      setScore(67);
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>← Problems</Text>
        </TouchableOpacity>
        <View style={styles.badgeContainer}>
          <Text style={styles.levelText}>LVL {problem.level}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollArea}>
        {/* Title & Tier */}
        <View style={styles.titleSection}>
          <Text style={styles.problemTitle}>{problem.title}</Text>
          <Text style={styles.languageText}>{problem.language.toUpperCase()} · {problem.tier.toUpperCase()}</Text>
        </View>

        {/* Problem Description */}
        <View style={styles.descCard}>
          <Text style={styles.descHeading}>Problem Description</Text>
          <Text style={styles.descBody}>{problem.description}</Text>
        </View>

        {/* Code Editor Header */}
        <View style={styles.editorHeader}>
          <Text style={styles.editorHeading}>Code Editor</Text>
          <Text style={styles.charCount}>{code.length} chars</Text>
        </View>

        {/* Monospace Code Editor */}
        <View style={styles.editorContainer}>
          <TextInput
            multiline
            style={styles.codeTextInput}
            value={code}
            onChangeText={setCode}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.btn, styles.runBtn]}
            onPress={handleRunOrSubmit}
            disabled={isExecuting}
          >
            {isExecuting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.btnText}>Run Code ▶</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.submitBtn]}
            onPress={handleRunOrSubmit}
            disabled={isExecuting}
          >
            <Text style={styles.btnText}>Submit ✅</Text>
          </TouchableOpacity>
        </View>

        {/* Results Section */}
        {score !== null && (
          <View style={styles.resultsCard}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Evaluation Results</Text>
              <Text
                style={[
                  styles.scoreBadge,
                  { color: score === 100 ? "#10b981" : "#f59e0b" },
                ]}
              >
                Score: {score}%
              </Text>
            </View>

            {results.map((res) => (
              <View
                key={res.caseIndex}
                style={[
                  styles.resultItem,
                  {
                    borderLeftColor: res.passed ? "#10b981" : "#f43f5e",
                  },
                ]}
              >
                <Text style={styles.caseTitle}>
                  Case {res.caseIndex}: {res.passed ? "✅ Passed" : "❌ Failed"}
                </Text>
                {res.expected && (
                  <Text style={styles.diffText}>
                    Expected: {res.expected} | Actual: {res.actual}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090d16",
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  backButton: {
    paddingVertical: 4,
  },
  backText: {
    color: "#818cf8",
    fontSize: 13,
    fontWeight: "700",
  },
  badgeContainer: {
    backgroundColor: "#1e1b4b",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelText: {
    color: "#a5b4fc",
    fontSize: 11,
    fontWeight: "800",
  },
  scrollArea: {
    flex: 1,
    padding: 20,
  },
  titleSection: {
    marginBottom: 16,
  },
  problemTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#f8fafc",
  },
  languageText: {
    fontSize: 12,
    color: "#6366f1",
    fontWeight: "700",
    marginTop: 2,
  },
  descCard: {
    backgroundColor: "#0f172a",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 16,
  },
  descHeading: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  descBody: {
    fontSize: 14,
    color: "#cbd5e1",
    lineHeight: 20,
  },
  editorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  editorHeading: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  charCount: {
    fontSize: 11,
    color: "#475569",
    fontFamily: "monospace",
  },
  editorContainer: {
    backgroundColor: "#030712",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 12,
    minHeight: 180,
    marginBottom: 16,
  },
  codeTextInput: {
    color: "#38bdf8",
    fontSize: 13,
    fontFamily: "monospace",
    textAlignVertical: "top",
    minHeight: 160,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  runBtn: {
    backgroundColor: "#334155",
  },
  submitBtn: {
    backgroundColor: "#059669",
  },
  btnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  resultsCard: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 40,
    gap: 10,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  resultsTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#f1f5f9",
  },
  scoreBadge: {
    fontSize: 13,
    fontWeight: "800",
  },
  resultItem: {
    backgroundColor: "#030712",
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 4,
    gap: 2,
  },
  caseTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  diffText: {
    fontSize: 10,
    color: "#64748b",
    fontFamily: "monospace",
  },
});
