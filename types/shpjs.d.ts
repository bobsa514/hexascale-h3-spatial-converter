declare module 'shpjs' {
  import { FeatureCollection } from 'geojson';
  function shp(input: ArrayBuffer | string): Promise<FeatureCollection | FeatureCollection[]>;
  export default shp;
}
