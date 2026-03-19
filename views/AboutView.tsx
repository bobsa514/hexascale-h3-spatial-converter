import React from 'react';
import { Github, ExternalLink, Shield, Code2, Hexagon } from 'lucide-react';

interface Props {
  onNavigateToApp: () => void;
}

export const AboutView: React.FC<Props> = ({ onNavigateToApp }) => {
  return (
    <div className="max-w-[700px] mx-auto py-12">
      {/* Page Header */}
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-white">About HexaScale</h2>
        <p className="text-gray-400 mt-2">Convert geospatial data into H3 hexagonal grids — entirely in your browser.</p>
      </div>

      <div className="space-y-10">
        {/* What is H3? */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Hexagon className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">What is H3?</h3>
          </div>
          <p className="text-gray-300 leading-relaxed">
            H3 is a hierarchical hexagonal grid system developed by Uber. It divides the world into hexagonal cells at multiple resolutions. Hexagons are better than squares for spatial analysis — every neighbor is equidistant (no diagonal ambiguity), edges are shared evenly, and aggregation across cells is smooth and consistent.
          </p>
        </section>

        {/* Methodology */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Code2 className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Methodology</h3>
          </div>
          <div className="text-gray-300 leading-relaxed space-y-3">
            <p>
              HexaScale correctly distinguishes between <strong className="text-white">intensive</strong> variables
              (income, density, temperature — area-weighted average) and <strong className="text-white">extensive</strong> variables
              (population, count, volume — proportionally distributed). Most tools treat all variables the same, producing subtly wrong results.
            </p>
            <p>
              Both processing modes guarantee <strong className="text-white">total conservation</strong>: the sum of output values across all hexagons equals the input total. The <em>Exact Area</em> mode computes real polygon–hexagon intersection areas using geometric intersection, while <em>Approximate</em> mode distributes values equally across covered cells.
            </p>
            <p>
              <strong className="text-white">Categorical</strong> columns (text attributes like zone names) are assigned using a "largest overlap" strategy — each hexagon gets the value from the source polygon with the greatest intersection area.
            </p>
          </div>
        </section>

        {/* Privacy */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Privacy</h3>
          </div>
          <p className="text-gray-300 leading-relaxed">
            All processing happens in your browser using Web Workers. No data is uploaded to any server. There is no backend. Your files never leave your machine.
          </p>
        </section>

        {/* Open Source */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Github className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Open Source</h3>
          </div>
          <p className="text-gray-300 leading-relaxed">
            HexaScale is MIT licensed and open source.{' '}
            <a
              href="https://github.com/bobsa514/hexascale-h3-spatial-converter"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
            >
              View on GitHub <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </p>
        </section>

        {/* Author */}
        <section className="border-t border-gray-800 pt-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center text-gray-400 font-bold text-lg border border-gray-700">
              B
            </div>
            <div>
              <div className="text-white font-semibold">Boyang Sa</div>
              <div className="text-sm text-gray-400 flex items-center gap-2">
                <a href="https://boyangsa.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">boyangsa.com</a>
                <span className="text-gray-600">·</span>
                <a href="https://github.com/bobsa514" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">GitHub</a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
