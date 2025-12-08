// components/SimilaritySearch.tsx
import React, { useState } from 'react';
import { Search, Database, AlertTriangle, CheckCircle } from 'lucide-react';

interface SimilaritySearchProps {
  onSimilarityCheck: (query: string) => Promise<any>;
}

const SimilaritySearch: React.FC<SimilaritySearchProps> = ({ onSimilarityCheck }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  const handleCheckSimilarity = async () => {
    if (!query.trim()) return;
    
    setChecking(true);
    try {
      const result = await onSimilarityCheck(query);
      setResults(result);
    } catch (error) {
      console.error('Similarity check failed:', error);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
        <Database className="w-4 h-4 text-blue-600" />
        Check for Similar Questions
      </h3>
      
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter question title or description..."
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          onClick={handleCheckSimilarity}
          disabled={checking || !query.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {checking ? 'Checking...' : 'Check'}
        </button>
      </div>

      {results && (
        <div className={`p-3 rounded-lg border ${
          results.duplication_risk === 'high' 
            ? 'bg-red-50 border-red-200' 
            : results.duplication_risk === 'medium'
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {results.duplication_risk === 'high' ? (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            ) : results.duplication_risk === 'medium' ? (
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green-600" />
            )}
            <span className="text-sm font-bold">
              {results.duplication_risk === 'high' ? 'High Similarity Risk' :
               results.duplication_risk === 'medium' ? 'Medium Similarity Risk' :
               'Low Similarity Risk'}
            </span>
          </div>
          <p className="text-xs text-gray-600">
            Found {results.similar_questions_found} similar questions
            {results.similar_questions_found > 0 && ` (${results.top_matches?.length || 0} shown)`}
          </p>
          
          {results.top_matches && results.top_matches.length > 0 && (
            <div className="mt-2 space-y-1">
              {results.top_matches.slice(0, 3).map((match: any, index: number) => (
                <div key={index} className="text-xs p-2 bg-white rounded border">
                  <div className="font-medium">{match.title}</div>
                  <div className="text-gray-500">Score: {(match.similarity_score * 100).toFixed(1)}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SimilaritySearch;