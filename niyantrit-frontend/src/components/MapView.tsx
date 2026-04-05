import { useMemo, useState } from "react";
import { MapPin, Navigation, Maximize2 } from "lucide-react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
  ZoomControl,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { Project } from "../context/AppContext";

interface MapViewProps {
  projects: Project[];
  userLocation: { lat: number; lng: number } | null;
  onProjectClick: (projectId: string) => void;
  projectCounts?: Record<string, number>;
}

const INDIA_CENTER: LatLngExpression = [22.5, 78.5];

function densityTone(count: number, max: number) {
  const ratio = max <= 0 ? 0 : count / max;
  if (ratio >= 0.7) return "#dc2626";
  if (ratio >= 0.4) return "#f97316";
  if (ratio >= 0.2) return "#f59e0b";
  return "#2563eb";
}

function statusTone(status: Project["status"]) {
  if (status === "Completed") return "#10b981";
  if (status === "Ongoing") return "#f59e0b";
  return "#94a3b8";
}

function isValidCoord(value: number | null | undefined) {
  return typeof value === "number" && !Number.isNaN(value) && Math.abs(value) > 0;
}

function hashSeed(input: string) {
  return Array.from(input).reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function pseudoCoordinates(projectId: string, index: number) {
  const baseLat = 22.5;
  const baseLng = 78.5;
  const seed = hashSeed(projectId) + index * 97;
  const angle = (seed % 360) * (Math.PI / 180);
  const radius = 2 + (seed % 80) / 10;

  return {
    lat: baseLat + radius * Math.cos(angle),
    lng: baseLng + radius * Math.sin(angle),
  };
}

export function MapView({
  projects,
  userLocation,
  onProjectClick,
  projectCounts,
}: MapViewProps) {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const maxCount = projectCounts
    ? Math.max(1, ...Object.values(projectCounts))
    : 1;

  const projectPoints = useMemo(
    () =>
      projects.map((project, index) => {
        const hasCoords =
          isValidCoord(project.location.latitude) &&
          isValidCoord(project.location.longitude);

        const coords = hasCoords
          ? {
              lat: project.location.latitude as number,
              lng: project.location.longitude as number,
            }
          : pseudoCoordinates(project.id, index);

        return { project, coords };
      }),
    [projects],
  );

  const mapCenter: LatLngExpression = userLocation
    ? [userLocation.lat, userLocation.lng]
    : projectPoints[0]
      ? [projectPoints[0].coords.lat, projectPoints[0].coords.lng]
      : INDIA_CENTER;

  const mapZoom = projects.length <= 1 ? 10 : 5;

  const handleProjectClick = (projectId: string) => {
    setSelectedProject(projectId);
    onProjectClick(projectId);
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        zoomControl={false}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />

        {userLocation && (
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={8}
            pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.9 }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              Your location
            </Tooltip>
          </CircleMarker>
        )}

        {projectPoints.map(({ project, coords }) => {
          const issueCount = projectCounts?.[project.id] ?? 0;
          const showCounts = Boolean(projectCounts);
          const color = showCounts
            ? densityTone(issueCount, maxCount)
            : statusTone(project.status);

          const ratio = maxCount <= 0 ? 0 : issueCount / maxCount;
          const radius = showCounts
            ? 6 + Math.min(10, Math.round(ratio * 10))
            : 8;

          const isSelected = selectedProject === project.id;

          return (
            <CircleMarker
              key={project.id}
              center={[coords.lat, coords.lng]}
              radius={isSelected ? radius + 2 : radius}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.85,
                weight: isSelected ? 3 : 2,
              }}
              eventHandlers={{
                click: () => handleProjectClick(project.id),
              }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                {project.name}
              </Tooltip>
              <Popup>
                <div className="space-y-1 text-sm">
                  <p className="text-foreground" style={{ fontWeight: 600 }}>
                    {project.name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {project.location.city}, {project.location.state}
                  </p>
                  <p className="text-xs text-muted-foreground">Status: {project.status}</p>
                  {showCounts && (
                    <p className="text-xs text-muted-foreground">
                      Issues: {issueCount}
                    </p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div className="pointer-events-none absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between">
        <div className="pointer-events-auto bg-white rounded-lg shadow-lg px-4 py-2 flex items-center gap-2">
          <Navigation className="w-5 h-5 text-primary" />
          <span className="text-sm text-gray-700">
            {projectCounts ? "Issue Map View" : "Live Map View"}
          </span>
        </div>
        <button className="pointer-events-auto bg-white rounded-lg shadow-lg p-2 hover:bg-gray-50 transition-colors">
          <Maximize2 className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-3">
        {projectCounts ? (
          <>
            <p className="text-xs text-gray-600 mb-2">Issue Density</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-gray-700">Low</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-gray-700">Medium</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-gray-700">High</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-600" />
                <span className="text-xs text-gray-700">Critical</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-gray-600 mb-2">Status</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-gray-700">Ongoing</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-gray-700">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-700">Pending</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-4 right-4 z-[1000] bg-primary text-primary-foreground rounded-lg shadow-lg px-4 py-2">
        <p className="text-sm">
          <span className="text-2xl">{projects.length}</span> Projects
        </p>
      </div>
    </div>
  );
}
