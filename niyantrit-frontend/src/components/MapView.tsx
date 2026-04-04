import { useEffect, useMemo, useRef, useState } from "react";
import { Navigation } from "lucide-react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { Project } from "../context/AppContext";

interface MapViewProps {
  projects: Project[];
  userLocation: { lat: number; lng: number } | null;
  onProjectClick: (projectId: string) => void;
}

const INDIA_CENTER: [number, number] = [20.5937, 78.9629];
const USER_MARKER_COLOR = "#2563EB";
const DISTANCE_OPTIONS = [5, 10, 25, 50, 100, 250, "all"] as const;

type MapStatusFilter = "All" | Project["status"];
type DistanceFilterValue = (typeof DISTANCE_OPTIONS)[number];

function markerTone(status: Project["status"]) {
  if (status === "Completed") return "#138808";
  if (status === "Ongoing") return "#FF9933";
  return "#6B7280";
}

function isValidCoordinate(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function FitBounds({
  points,
  selectedPoint,
  fallbackCenter,
  skipNextFitSignal,
}: {
  points: Array<[number, number]>;
  selectedPoint: [number, number] | null;
  fallbackCenter: [number, number];
  skipNextFitSignal: number;
}) {
  const map = useMap();
  const skipNextFitRef = useRef(false);

  useEffect(() => {
    skipNextFitRef.current = true;
  }, [skipNextFitSignal]);

  useEffect(() => {
    if (selectedPoint) {
      map.flyTo(selectedPoint, 11, { duration: 0.8 });
      return;
    }

    if (skipNextFitRef.current) {
      skipNextFitRef.current = false;
      return;
    }

    if (!points.length) {
      map.setView(fallbackCenter, 5);
      return;
    }

    if (points.length === 1) {
      map.flyTo(points[0], 10, { duration: 0.8 });
      return;
    }

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds.pad(0.2));
  }, [map, points, selectedPoint, fallbackCenter]);

  return null;
}

function ClearSelectionOnMapClick({
  clearSelection,
}: {
  clearSelection: () => void;
}) {
  useMapEvents({
    click: () => clearSelection(),
  });

  return null;
}

function SyncLeafletLayout({
  resizeSignal,
}: {
  resizeSignal: number;
}) {
  const map = useMap();

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      map.invalidateSize({ pan: false, debounceMoveend: true });
    });

    return () => window.cancelAnimationFrame(raf);
  }, [map, resizeSignal]);

  useEffect(() => {
    const container = map.getContainer();

    const onWindowResize = () => {
      map.invalidateSize({ pan: false, debounceMoveend: true });
    };

    window.addEventListener("resize", onWindowResize);

    const observer = new ResizeObserver(() => {
      map.invalidateSize({ pan: false, debounceMoveend: true });
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onWindowResize);
    };
  }, [map]);

  return null;
}

function EnsureMapInteraction() {
  const map = useMap();

  useEffect(() => {
    map.scrollWheelZoom.enable();
    map.dragging.enable();
    map.doubleClickZoom.enable();
  }, [map]);

  return null;
}

function ManualMapActions({
  locateSignal,
  fitSignal,
  userPoint,
  points,
}: {
  locateSignal: number;
  fitSignal: number;
  userPoint: [number, number] | null;
  points: Array<[number, number]>;
}) {
  const map = useMap();

  useEffect(() => {
    if (!locateSignal || !userPoint) return;
    map.flyTo(userPoint, 10, { duration: 0.8 });
  }, [locateSignal, userPoint, map]);

  useEffect(() => {
    if (!fitSignal) return;

    if (points.length === 1) {
      map.flyTo(points[0], 10, { duration: 0.8 });
      return;
    }

    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points).pad(0.2));
      return;
    }

    if (userPoint) {
      map.flyTo(userPoint, 6, { duration: 0.8 });
    }
  }, [fitSignal, points, userPoint, map]);

  return null;
}

function MapView({ projects, userLocation, onProjectClick }: MapViewProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<MapStatusFilter>("All");
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilterValue>("all");
  const [skipNextFitSignal, setSkipNextFitSignal] = useState(0);
  const [locateSignal, setLocateSignal] = useState(0);
  const [fitSignal, setFitSignal] = useState(0);

  const clearSelectedProject = () => {
    if (selectedProjectId === "All") return;
    setSkipNextFitSignal((current) => current + 1);
    setSelectedProjectId("All");
  };

  const handleProjectMarkerClick = (projectId: string) => {
    setSelectedProjectId((current) => {
      if (current === projectId) {
        setSkipNextFitSignal((value) => value + 1);
        return "All";
      }
      return projectId;
    });
  };

  const mappableProjects = useMemo(
    () =>
      projects.filter((project) =>
        isValidCoordinate(project.location.latitude, project.location.longitude)
      ),
    [projects]
  );

  const filteredByStatus = useMemo(() => {
    if (statusFilter === "All") return mappableProjects;
    return mappableProjects.filter((project) => project.status === statusFilter);
  }, [mappableProjects, statusFilter]);

  const distanceOrigin = useMemo<[number, number]>(
    () => (userLocation ? [userLocation.lat, userLocation.lng] : INDIA_CENTER),
    [userLocation]
  );

  const filteredByDistance = useMemo(() => {
    if (distanceFilter === "all") return filteredByStatus;

    return filteredByStatus.filter((project) => {
      const distance = haversineDistanceKm(
        distanceOrigin[0],
        distanceOrigin[1],
        project.location.latitude,
        project.location.longitude
      );

      return distance <= distanceFilter;
    });
  }, [filteredByStatus, distanceFilter, distanceOrigin]);

  useEffect(() => {
    if (selectedProjectId === "All") return;
    const stillVisible = filteredByDistance.some((project) => project.id === selectedProjectId);
    if (!stillVisible) setSelectedProjectId("All");
  }, [filteredByDistance, selectedProjectId]);

  const visibleProjects = useMemo(() => {
    if (selectedProjectId === "All") return filteredByDistance;
    return filteredByDistance.filter((project) => project.id === selectedProjectId);
  }, [filteredByDistance, selectedProjectId]);

  const selectedProject = useMemo(
    () => mappableProjects.find((project) => project.id === selectedProjectId) || null,
    [mappableProjects, selectedProjectId]
  );

  const userPoint = userLocation ? ([userLocation.lat, userLocation.lng] as [number, number]) : null;

  const fallbackCenter: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : INDIA_CENTER;

  const pointList = useMemo<Array<[number, number]>>(
    () => visibleProjects.map((project) => [project.location.latitude, project.location.longitude]),
    [visibleProjects]
  );

  const selectedPoint = selectedProject
    ? ([selectedProject.location.latitude, selectedProject.location.longitude] as [number, number])
    : null;

  const distanceFilterLabel =
    distanceFilter === "all" ? "across all distances" : `within ${distanceFilter} km`;

  return (
    <div className="relative h-[420px] min-h-[340px] w-full">
      <div className="relative h-full w-full overflow-hidden rounded-xl border border-border shadow-inner">
        <MapContainer
          center={fallbackCenter}
          zoom={6}
          scrollWheelZoom={true}
          className="h-full w-full cursor-grab active:cursor-grabbing"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <EnsureMapInteraction />
          <ManualMapActions
            locateSignal={locateSignal}
            fitSignal={fitSignal}
            userPoint={userPoint}
            points={pointList}
          />
          <ClearSelectionOnMapClick clearSelection={clearSelectedProject} />

          <FitBounds
            points={pointList}
            selectedPoint={selectedPoint}
            fallbackCenter={fallbackCenter}
            skipNextFitSignal={skipNextFitSignal}
          />

          <SyncLeafletLayout resizeSignal={skipNextFitSignal} />

          {userLocation ? (
            <CircleMarker
              center={[userLocation.lat, userLocation.lng]}
              radius={8}
              pathOptions={{
                color: USER_MARKER_COLOR,
                fillColor: USER_MARKER_COLOR,
                fillOpacity: 0.9,
              }}
            >
              <Tooltip direction="top" offset={[0, -4]}>
                Your location
              </Tooltip>
            </CircleMarker>
          ) : null}

          {visibleProjects.map((project) => (
            <CircleMarker
              key={project.id}
              center={[project.location.latitude, project.location.longitude]}
              radius={project.id === selectedProjectId ? 10 : 7}
              eventHandlers={{
                click: () => handleProjectMarkerClick(project.id),
              }}
              pathOptions={{
                color: markerTone(project.status),
                fillColor: markerTone(project.status),
                fillOpacity: 0.85,
                bubblingMouseEvents: false,
              }}
            >
              <Tooltip direction="top" offset={[0, -4]}>
                {project.name}
              </Tooltip>
              <Popup>
                <div className="min-w-[220px] space-y-2">
                  <h4 className="text-sm font-semibold text-[#0A3D62]">{project.name}</h4>
                  <p className="text-xs text-gray-600">
                    {project.location.city}, {project.location.state}
                  </p>
                  <p className="text-xs text-gray-600">Status: {project.status}</p>
                  <button
                    type="button"
                    onClick={() => onProjectClick(project.id)}
                    className="w-full rounded-md bg-[#0A3D62] px-2 py-1.5 text-xs font-semibold text-white"
                  >
                    Open Project
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        <div className="absolute left-4 top-4 z-10">
          <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-lg">
            <Navigation className="h-5 w-5 text-[#FF9933]" />
            <span className="text-sm text-gray-700">Live Project Map</span>
          </div>
        </div>

        <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFitSignal((current) => current + 1)}
            className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-lg hover:bg-gray-50"
          >
            Fit Projects
          </button>
          <button
            type="button"
            onClick={() => setLocateSignal((current) => current + 1)}
            disabled={!userPoint}
            className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-lg hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Locate Me
          </button>
        </div>

        <div className="absolute left-4 top-16 z-10 flex flex-col gap-2 rounded-lg bg-white/95 p-3 shadow-lg">
          <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
            Filter Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as MapStatusFilter)}
              className="mt-1 block w-44 rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-700"
            >
              <option value="All">All</option>
              <option value="Pending">Pending</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
            </select>
          </label>

          <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
            Select Project
            <select
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
              className="mt-1 block w-44 rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-700"
            >
              <option value="All">All Projects</option>
              {filteredByDistance.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
            Distance Range
            <select
              value={distanceFilter}
              onChange={(event) => {
                const { value } = event.target;
                setDistanceFilter(value === "all" ? "all" : (Number(value) as DistanceFilterValue));
              }}
              className="mt-1 block w-44 rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-700"
            >
              {DISTANCE_OPTIONS.map((option) => (
                <option key={String(option)} value={option}>
                  {option === "all" ? "All Distances" : `Within ${option} km`}
                </option>
              ))}
            </select>
          </label>

          {selectedProjectId !== "All" ? (
            <button
              type="button"
              onClick={clearSelectedProject}
              className="rounded border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Clear Selected Project
            </button>
          ) : null}
        </div>

        {visibleProjects.length === 0 ? (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-center">
            <p className="rounded-lg border border-border bg-white px-4 py-2 text-sm text-gray-600">
              No projects match current map filters.
            </p>
          </div>
        ) : null}

        {visibleProjects.length === 0 && distanceFilter !== "all" ? (
          <button
            type="button"
            onClick={() => setDistanceFilter("all")}
            className="absolute right-4 top-16 z-20 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-lg hover:bg-gray-50"
          >
            Show All Distances
          </button>
        ) : null}

        <div className="absolute bottom-4 left-4 rounded-lg bg-white p-3 shadow-lg">
          <p className="mb-2 text-xs text-gray-600">Status</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#FF9933]" />
              <span className="text-xs text-gray-700">Ongoing</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#138808]" />
              <span className="text-xs text-gray-700">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-gray-500" />
              <span className="text-xs text-gray-700">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: USER_MARKER_COLOR }} />
              <span className="text-xs text-gray-700">You</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 right-4 rounded-lg bg-[#0A3D62] px-4 py-2 text-white shadow-lg">
          <p className="text-sm">
            <span className="text-2xl">{visibleProjects.length}</span> shown {distanceFilterLabel}
          </p>
        </div>

      </div>
    </div>
  );
}

export default MapView;
