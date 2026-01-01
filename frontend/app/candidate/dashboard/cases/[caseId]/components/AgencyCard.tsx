import { Building2, MapPin, Mail, Phone, Globe, Star } from "lucide-react";

interface AgencyCardProps {
  agency: {
    agency_id: string;
    name: string;
    type: string;
    email?: string;
    phone?: string;
    website?: string;
    operating_countries: string[];
    rating?: number;
  };
  onSelect: (agencyId: string) => void;
  isSelecting: boolean;
}

export default function AgencyCard({ agency, onSelect, isSelecting }: AgencyCardProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-xl p-5 border-2 border-slate-200 hover:border-blue-300 transition-all hover:shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-100 rounded-lg shrink-0">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg mb-1">
                {agency.name}
              </h3>
              {agency.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-medium text-slate-700">
                    {agency.rating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {agency.operating_countries && agency.operating_countries.length > 0 && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <p className="text-sm text-slate-600">
                {agency.operating_countries.join(", ")}
              </p>
            </div>
          )}

          {agency.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <p className="text-sm text-slate-600 truncate">{agency.email}</p>
            </div>
          )}

          {agency.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <p className="text-sm text-slate-600">{agency.phone}</p>
            </div>
          )}

          {agency.website && (
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-400 shrink-0" />
              <a
                href={agency.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline truncate"
                onClick={(e) => e.stopPropagation()}
              >
                {agency.website}
              </a>
            </div>
          )}
        </div>
      </div>
      <button
        onClick={() => onSelect(agency.agency_id)}
        disabled={isSelecting}
        className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSelecting ? "Selecting..." : "Select This Agency"}
      </button>
    </div>
  );
}