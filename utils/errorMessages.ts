const ERROR_MAP: Record<string, string> = {
  'Feature collection is empty.': 'The uploaded file contains no geographic features. Please check that your file has valid data.',
  'Unsupported Geometry Type': 'This geometry type is not supported. HexaScale works with Points, Lines, and Polygons.',
  'No valid coordinates found': 'No valid coordinates were found in the selected columns. Please verify your latitude and longitude column selections.',
  'Failed to parse GeoJSON': 'The file could not be read as GeoJSON. Please check that it is a valid GeoJSON file.',
  'Failed to parse CSV': 'The CSV file could not be read. Please check that it is properly formatted.',
  'Failed to parse KML': 'The KML file could not be read. Please check that it is a valid KML file.',
  'Failed to parse Shapefile': 'The Shapefile could not be read. Please ensure the ZIP contains valid .shp, .shx, and .dbf files.',
};

export function toUserMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);

  for (const [pattern, friendly] of Object.entries(ERROR_MAP)) {
    if (msg.includes(pattern)) return friendly;
  }

  if (msg.length > 200) {
    return 'An unexpected error occurred during processing. Please try again with a different file or settings.';
  }

  return msg;
}
