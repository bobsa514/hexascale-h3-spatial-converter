import { ColumnConfig, ColumnType, PointAggregation, GeoType } from "../types";

type RawColumn = { name: string; sample: any };

/** Split a column name into tokens on _ and non-alphanumeric boundaries */
const tokenize = (name: string): string[] => {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
};

/** Check if any token in `tokens` exactly matches any of `needles` */
const hasAnyToken = (tokens: string[], needles: string[]): boolean =>
  tokens.some(t => needles.includes(t));

/** Check if the key (joined tokens) contains a substring — used only for compound patterns like "per_" */
const hasSubstring = (key: string, needle: string): boolean =>
  key.includes(needle);

const isNumericSample = (value: any) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return false;
    return Number.isFinite(Number(trimmed));
  }
  return false;
};

const classifyType = (tokens: string[], key: string, numericHint: boolean): ColumnType => {
  const idTokens = ["id", "gid", "geoid", "fips", "tract", "county", "state", "zip", "zipcode"];
  if (hasAnyToken(tokens, idTokens)) return ColumnType.ID;

  const intensiveTokens = [
    "avg", "average", "mean", "median", "rate", "pct", "percent",
    "ratio", "density", "index", "income", "price", "age",
    "temp", "temperature", "score"
  ];
  if (hasAnyToken(tokens, intensiveTokens)) return ColumnType.INTENSIVE;
  // "per_" is a substring pattern (e.g. per_capita)
  if (hasSubstring(key, "per_")) return ColumnType.INTENSIVE;

  const extensiveTokens = [
    "count", "total", "sum", "pop", "population", "house", "household",
    "hh", "jobs", "units", "cases", "incidents", "volume", "area",
    "length", "num", "number"
  ];
  if (hasAnyToken(tokens, extensiveTokens)) return ColumnType.EXTENSIVE;

  return numericHint ? ColumnType.INTENSIVE : ColumnType.ID;
};

const classifyPointAggregation = (tokens: string[], key: string, numericHint: boolean): PointAggregation => {
  if (hasAnyToken(tokens, ["min"])) return PointAggregation.MIN;
  if (hasAnyToken(tokens, ["max"])) return PointAggregation.MAX;
  if (hasAnyToken(tokens, ["avg", "average", "mean", "median", "rate", "pct", "percent", "ratio", "density", "index"])) {
    return PointAggregation.AVERAGE;
  }
  if (hasAnyToken(tokens, ["sum", "total", "pop", "population", "count", "num", "number", "cases", "units", "volume"])) {
    return PointAggregation.SUM;
  }

  return numericHint ? PointAggregation.SUM : PointAggregation.COUNT;
};

export const analyzeColumnsLocally = async (
  columns: RawColumn[],
  geoType: GeoType
): Promise<Partial<ColumnConfig>[]> => {
  return columns.map(col => {
    const tokens = tokenize(col.name);
    const key = tokens.join("_");
    const numericHint = isNumericSample(col.sample);

    const type =
      geoType === GeoType.POINT
        ? ColumnType.EXTENSIVE
        : classifyType(tokens, key, numericHint);

    const pointAggregation = classifyPointAggregation(tokens, key, numericHint);

    return {
      name: col.name,
      type,
      pointAggregation
    };
  });
};

// Re-export for testing
export { tokenize, hasAnyToken, isNumericSample };
