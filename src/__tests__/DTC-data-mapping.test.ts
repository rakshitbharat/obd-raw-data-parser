import { DTCBaseDecoder } from "../index.js";
import { readFileSync } from "fs";
import { join } from "path";

interface DTCEntry {
  s: string; // Service mode
  b: number[][]; // Byte arrays
  r: string[]; // Response codes
}

interface TestStats {
  total: number;
  passed: number;
  failed: number;
  byMode: Record<
    string,
    {
      total: number;
      passed: number;
      failed: number;
    }
  >;
}

const SERVICE_MODE_CONFIG = {
  "03": { mode: "03", type: "CURRENT" },
  "07": { mode: "07", type: "PENDING" },
  "0A": { mode: "0A", type: "PERMANENT" },
} as const;

describe("DTC Data Validation", () => {
  // Load and prepare test data
  const testCases = (() => {
    const dataPath = join(__dirname, "data-v1.json");
    const rawData = readFileSync(dataPath, "utf8");
    return JSON.parse(rawData) as DTCEntry[];
  })();

  // Initialize test statistics
  const stats: TestStats = {
    total: testCases.length,
    passed: 0,
    failed: 0,
    byMode: Object.fromEntries(
      Object.entries(SERVICE_MODE_CONFIG).map(([mode]) => [
        mode,
        {
          total: testCases.filter((entry) => entry.s === mode).length,
          passed: 0,
          failed: 0,
        },
      ])
    ),
  };

  // Create indexed test cases
  const indexedTestCases = testCases.map((entry, index) => ({
    ...entry,
    testIndex: index + 1,
  }));

  // Run test for each DTC entry
  it.each(indexedTestCases)(
    "Test Case $testIndex: Mode $s should decode DTCs correctly",
    ({ s: serviceMode, b: bytes, r: expected }) => {
      const config =
        SERVICE_MODE_CONFIG[serviceMode as keyof typeof SERVICE_MODE_CONFIG];

      // Validate service mode
      if (!config) {
        throw new Error(`Invalid service mode: ${serviceMode}`);
        return;
      }

      // Create decoder and process DTCs
      const decoder = new DTCBaseDecoder({
        logPrefix: "TEST",
        isCan: true,
        serviceMode: config.mode,
        troubleCodeType: config.type,
      });

      const result = decoder.decodeDTCs(bytes);

      // Compare results
      const sortedResult = result.sort();
      const sortedExpected = [...expected].sort();

      try {
        expect(sortedResult).toEqual(sortedExpected);
        stats.passed++;
        stats.byMode[serviceMode].passed++;
      } catch (error) {
        stats.failed++;
        stats.byMode[serviceMode].failed++;
        throw error;
      }
    }
  );

  test('verifies final statistics', () => {
    expect(stats.passed + stats.failed).toBe(stats.total);
    Object.entries(stats.byMode).forEach(([, modeStats]) => {
      expect(modeStats.passed + modeStats.failed).toBe(modeStats.total);
    });
  });

});
