import * as h3 from 'h3-js';
import * as turf from '@turf/turf';
import { FeatureCollection, Feature, Geometry, Position } from 'geojson';
import { ColumnConfig, ColumnType, PointAggregation, HexResult, GeoType } from '../types';
import { ProcessingWarnings } from '../utils/errors';
import { getGeoType } from '../utils/geoType';

export { getGeoType };

export interface ProcessingResult {
  results: HexResult[];
  warnings: ProcessingWarnings;
}

// --- Ring Aggregation (Spatial Smoothing) ---

const applyRingAggregation = (
    data: HexResult[],
    columns: ColumnConfig[]
): HexResult[] => {
    const colsToAggregate = columns.filter(c => c.ringSize && c.ringSize > 0 && c.type !== ColumnType.ID && c.type !== ColumnType.IGNORE);

    if (colsToAggregate.length === 0) {
        return data;
    }

    const dataMap = new Map<string, HexResult>();
    data.forEach(row => dataMap.set(row.hexId, row));

    return data.map(currentRow => {
        const newRow: HexResult = { ...currentRow };

        colsToAggregate.forEach(col => {
            const k = col.ringSize || 0;
            const targetField = col.outputName;

            const neighbors = h3.gridDisk(currentRow.hexId, k);

            let sum = 0;
            let count = 0;

            for (const neighborHexId of neighbors) {
                const neighborData = dataMap.get(neighborHexId);
                if (neighborData) {
                    const val = parseFloat(neighborData[targetField]);
                    if (!isNaN(val)) {
                        sum += val;
                        count++;
                    }
                }
            }

            const isIntensive =
                col.type === ColumnType.INTENSIVE ||
                (col.type === 'Aggregated Value' as any) ||
                col.pointAggregation === PointAggregation.AVERAGE ||
                col.pointAggregation === PointAggregation.MIN ||
                col.pointAggregation === PointAggregation.MAX;

            if (isIntensive) {
                newRow[targetField] = count > 0 ? sum / count : 0;
            } else {
                newRow[targetField] = sum;
            }
        });

        return newRow;
    });
};

// --- Polygon Processing ---

const processPolygons = (
  fc: FeatureCollection,
  resolution: number,
  columns: ColumnConfig[],
  warnings: ProcessingWarnings,
  onProgress?: (processed: number, total: number) => void
): HexResult[] => {
  const hexMap = new Map<
    string,
    {
      data: Record<string, any>;
      intensiveSum: Record<string, number>;
      intensiveWeight: Record<string, number>;
    }
  >();
  const hexAreaM2 = h3.getHexagonAreaAvg(resolution, h3.UNITS.m2);
  const hasExtensive = columns.some(c => c.type === ColumnType.EXTENSIVE);
  const hasPreciseExtensive = columns.some(
    c => c.type === ColumnType.EXTENSIVE && c.extensiveMode === 'precise'
  );
  const total = fc.features.length;
  const step = Math.max(1, Math.floor(total / 200));
  let processed = 0;

  fc.features.forEach((feature) => {
    if (!feature.geometry) return;

    const props = feature.properties || {};
    const type = feature.geometry.type;
    const polygonAreaM2 = hasExtensive ? turf.area(feature as any) : 0;

    let polys: Position[][][] = [];

    if (type === 'Polygon') {
        polys = [feature.geometry.coordinates as Position[][]];
    } else if (type === 'MultiPolygon') {
        polys = feature.geometry.coordinates as Position[][][];
    } else {
        return;
    }

    let allCells: string[] = [];
    polys.forEach(polyCoords => {
        try {
            const cells = hasPreciseExtensive
              ? h3.polygonToCellsExperimental(
                    polyCoords,
                    resolution,
                    h3.POLYGON_TO_CELLS_FLAGS.containmentOverlapping,
                    true
                )
              : h3.polygonToCells(polyCoords, resolution, true);
            if (cells) {
                allCells = allCells.concat(cells);
            }
        } catch (e: any) {
            warnings.add(`H3 polygon processing error: ${e.message || 'unknown'}`);
        }
    });

    if (allCells.length === 0) return;

    const uniqueCells = Array.from(new Set(allCells));
    const preciseShareByCell = new Map<string, number>();
    let fastShare = 0;
    if (hasExtensive && polygonAreaM2 > 0) {
        const areaScale = Math.max(1, polygonAreaM2 / hexAreaM2);
        fastShare = 1 / areaScale;
    }

    const canUsePreciseWeight = hasPreciseExtensive && polygonAreaM2 > 0;
    const polygonParts = canUsePreciseWeight
        ? turf
            .flatten(feature as any)
            .features.filter((f: any) => f?.geometry?.type === 'Polygon')
        : [];

    if (canUsePreciseWeight) {
        uniqueCells.forEach((cellId) => {
            const boundary = h3.cellToBoundary(cellId, true);
            if (!boundary || boundary.length < 3) {
                preciseShareByCell.set(cellId, 0);
                return;
            }
            const first = boundary[0]!;
            const last = boundary[boundary.length - 1]!;
            const ring = first[0] === last[0] && first[1] === last[1]
                ? boundary
                : [...boundary, first];
            const hexPoly = turf.polygon([ring]);
            let intersectArea = 0;
            try {
                for (const part of polygonParts) {
                    const fcIntersect = turf.featureCollection([part as any, hexPoly as any]);
                    const intersection = turf.intersect(fcIntersect as any) as any;
                    if (intersection) {
                        intersectArea += turf.area(intersection);
                    }
                }
            } catch (e: any) {
                warnings.add(`Polygon intersection calculation failed: ${e.message || 'unknown'}`);
                intersectArea = 0;
            }
            preciseShareByCell.set(cellId, intersectArea / polygonAreaM2);
        });
    }

    uniqueCells.forEach((cellId) => {
        const entry = hexMap.get(cellId) || {
            data: {},
            intensiveSum: {},
            intensiveWeight: {}
        };

        if (columns && columns.length > 0) {
            columns.forEach(col => {
                const targetField = col.outputName;

                if (col.type === ColumnType.ID) {
                    if (entry.data[targetField] === undefined) {
                        entry.data[targetField] = props[col.name];
                    }
                    return;
                }

                const rawVal = parseFloat(props[col.name] || 0);
                if (isNaN(rawVal)) {
                    return;
                }

                if (col.type === ColumnType.INTENSIVE) {
                    const weight = canUsePreciseWeight
                        ? (preciseShareByCell.get(cellId) || 0)
                        : 1;
                    if (weight > 0) {
                        entry.intensiveSum[targetField] = (entry.intensiveSum[targetField] || 0) + (rawVal * weight);
                        entry.intensiveWeight[targetField] = (entry.intensiveWeight[targetField] || 0) + weight;
                    }
                } else if (col.type === ColumnType.EXTENSIVE) {
                    const usePrecise = col.extensiveMode === 'precise';
                    const share = usePrecise ? (preciseShareByCell.get(cellId) || 0) : fastShare;
                    entry.data[targetField] = (entry.data[targetField] || 0) + (rawVal * share);
                }
            });
        }

        hexMap.set(cellId, entry);
    });

    processed++;
    if (onProgress && (processed % step === 0 || processed === total)) {
        onProgress(processed, total);
    }
  });

  return Array.from(hexMap.entries()).map(([hexId, val]) => {
    const output: any = { hexId, ...val.data };
    columns.forEach(col => {
      if (col.type !== ColumnType.INTENSIVE) return;
      const targetField = col.outputName;
      const sum = val.intensiveSum[targetField] || 0;
      const weight = val.intensiveWeight[targetField] || 0;
      output[targetField] = weight > 0 ? sum / weight : 0;
    });
    return output;
  });
};

// --- Point Processing ---

const processPoints = (
    fc: FeatureCollection,
    resolution: number,
    columns: ColumnConfig[],
    warnings: ProcessingWarnings,
    onProgress?: (processed: number, total: number) => void
): HexResult[] => {
    const hexBuckets = new Map<string, any[]>();
    const total = fc.features.length;
    const step = Math.max(1, Math.floor(total / 200));
    let processed = 0;

    fc.features.forEach(f => {
        if (!f.geometry) return;

        const type = f.geometry.type;
        let coordsList: Position[] = [];

        if (type === 'Point') {
            coordsList = [f.geometry.coordinates as Position];
        } else if (type === 'MultiPoint') {
            coordsList = f.geometry.coordinates as Position[];
        } else {
            return;
        }

        coordsList.forEach(coord => {
            const lon = coord[0];
            const lat = coord[1];
            if (lon === undefined || lat === undefined) return;
            if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return;

            try {
                const hexId = h3.latLngToCell(lat, lon, resolution);
                if (!hexBuckets.has(hexId)) hexBuckets.set(hexId, []);
                hexBuckets.get(hexId)!.push(f.properties || {});
            } catch (e: any) {
                warnings.add(`H3 point conversion error: ${e.message || 'unknown'}`);
            }
        });

        processed++;
        if (onProgress && (processed % step === 0 || processed === total)) {
            onProgress(processed, total);
        }
    });

    const results: HexResult[] = [];

    hexBuckets.forEach((propsList, hexId) => {
        const row: any = { hexId };

        columns.forEach(col => {
            const targetField = col.outputName;

            if (col.type === ColumnType.ID) return;

            const values = propsList.map(p => parseFloat(p[col.name] || 0)).filter(v => !isNaN(v));

            if (values.length === 0) {
                row[targetField] = 0;
                return;
            }

            switch (col.pointAggregation) {
                case PointAggregation.SUM:
                    row[targetField] = values.reduce((a, b) => a + b, 0);
                    break;
                case PointAggregation.AVERAGE:
                    row[targetField] = values.reduce((a, b) => a + b, 0) / values.length;
                    break;
                case PointAggregation.MIN:
                    row[targetField] = Math.min(...values);
                    break;
                case PointAggregation.MAX:
                    row[targetField] = Math.max(...values);
                    break;
                case PointAggregation.COUNT:
                    row[targetField] = values.length;
                    break;
                default:
                    row[targetField] = values.length;
            }
        });
        results.push(row);
    });

    return results;
};

// --- Line Processing ---

const processLines = (
    fc: FeatureCollection,
    resolution: number,
    columns: ColumnConfig[],
    warnings: ProcessingWarnings,
    onProgress?: (processed: number, total: number) => void
): HexResult[] => {
    const hexMap = new Map<string, any[]>();
    const total = fc.features.length;
    const step = Math.max(1, Math.floor(total / 200));
    let processed = 0;

    fc.features.forEach(f => {
        if (!f.geometry) return;
        const type = f.geometry.type;

        let lines: Position[][] = [];
        if (type === 'LineString') {
            lines = [f.geometry.coordinates as Position[]];
        } else if (type === 'MultiLineString') {
            lines = f.geometry.coordinates as Position[][];
        } else {
            return;
        }

        const featureCells = new Set<string>();

        lines.forEach(coords => {
            for (let i = 0; i < coords.length - 1; i++) {
                const start = coords[i]!;
                const end = coords[i+1]!;
                const dist = turf.distance(start, end, { units: 'kilometers' });
                const edgeLen = h3.getHexagonEdgeLengthAvg(resolution, h3.UNITS.km);
                const steps = Math.max(1, Math.ceil(dist / (edgeLen * 0.5)));

                for (let j = 0; j <= steps; j++) {
                    const interp = turf.along(turf.lineString([start, end]), (j/steps) * dist, { units: 'kilometers' });
                    const lon = interp.geometry.coordinates[0]!;
                    const lat = interp.geometry.coordinates[1]!;
                    try {
                        featureCells.add(h3.latLngToCell(lat, lon, resolution));
                    } catch (e: any) {
                        warnings.add(`H3 line sampling error: ${e.message || 'unknown'}`);
                    }
                }
            }
        });

        featureCells.forEach(hexId => {
            if (!hexMap.has(hexId)) hexMap.set(hexId, []);
            hexMap.get(hexId)!.push(f.properties);
        });

        processed++;
        if (onProgress && (processed % step === 0 || processed === total)) {
            onProgress(processed, total);
        }
    });

    const results: HexResult[] = [];

    hexMap.forEach((propsList, hexId) => {
        const row: any = { hexId };

        columns.forEach(col => {
             const targetField = col.outputName;
             const vals = propsList.map((p:any) => parseFloat(p[col.name] || 0)).filter((v:number) => !isNaN(v));

             if (col.type === ColumnType.INTENSIVE) {
                 const sum = vals.reduce((a:number,b:number) => a+b, 0);
                 row[targetField] = vals.length ? sum / vals.length : 0;
             } else if (col.type === ColumnType.EXTENSIVE) {
                 const sum = vals.reduce((a:number,b:number) => a+b, 0);
                 row[targetField] = sum;
             } else {
                 row[targetField] = propsList[0]?.[col.name];
             }
        });
        results.push(row);
    });

    return results;
}


export const processGeoJsonToH3 = async (
  fc: FeatureCollection,
  config: { h3Resolution: number; columns: ColumnConfig[]; onProgress?: (processed: number, total: number) => void }
): Promise<ProcessingResult> => {
  const type = getGeoType(fc);
  const warnings = new ProcessingWarnings();

  await new Promise(r => setTimeout(r, 100));

  if (!fc || !fc.features || fc.features.length === 0) {
      throw new Error("Feature collection is empty.");
  }

  const safeColumns = config.columns || [];

  let initialResults: HexResult[] = [];

  switch (type) {
    case GeoType.POLYGON:
      initialResults = processPolygons(fc, config.h3Resolution, safeColumns, warnings, config.onProgress);
      break;
    case GeoType.POINT:
      initialResults = processPoints(fc, config.h3Resolution, safeColumns, warnings, config.onProgress);
      break;
    case GeoType.LINE:
      initialResults = processLines(fc, config.h3Resolution, safeColumns, warnings, config.onProgress);
      break;
    default:
      throw new Error(`Unsupported Geometry Type: ${type || 'Unknown'}`);
  }

  const finalResults = applyRingAggregation(initialResults, safeColumns);
  return { results: finalResults, warnings };
};
