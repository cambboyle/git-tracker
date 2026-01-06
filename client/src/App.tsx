import { useEffect, useMemo, useState } from "react";
import "./App.scss";
import { api } from "./api";
import { useAuth } from "./AuthContext";
import { LoginForm } from "./LoginForm";
import { AdminDestinationsView } from "./AdminDestinationsView";
import { AdminRoutingRulesView } from "./AdminRoutingRulesView";
import { AdminUsersView } from "./AdminUsersView";

type ViewKey =
  | "events"
  | "deliveries"
  | "destinations"
  | "routing-rules"
  | "admin-destinations"
  | "admin-routing-rules"
  | "admin-users";

type EventDto = {
  id: number;
  eventType: string;
  repository: string;
  ref: string | null;
  actor: string | null;
  createdAt: string;
};

type DeliveryDto = {
  id: number;
  event: EventDto | null;
  eventId?: number;
  destinationId?: number;
  status: string;
  responseCode: number | null;
  errorMessage: string | null;
  createdAt: string;
};

type DestinationDto = {
  id: number;
  type: string;
  name: string;
  enabled: boolean;
  createdAt: string;
};

type RoutingRuleDto = {
  id: number;
  repository: string | null;
  ref: string | null;
  eventType: string | null;
  enabled: boolean;
  destination: DestinationDto;
  createdAt: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

// ----- Events -----

function EventsView(props: {
  selectedEventId: number | null;
  onSelectEvent: (id: number | null) => void;
}) {
  const { selectedEventId, onSelectEvent } = props;
  const [data, setData] = useState<EventDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedEventType, setSelectedEventType] = useState<string>("all");
  const [selectedRepository, setSelectedRepository] = useState<string>("all");

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<EventDto[]>("/api/events");
        if (isMounted) {
          setData(res.data);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load events";
        if (isMounted) {
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const eventTypes = useMemo(() => {
    const types = Array.from(new Set(data.map((e) => e.eventType))).sort();
    return types;
  }, [data]);

  const repositories = useMemo(() => {
    const repos = Array.from(new Set(data.map((e) => e.repository))).sort();
    return repos;
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((e) => {
      if (selectedEventType !== "all" && e.eventType !== selectedEventType) {
        return false;
      }
      if (selectedRepository !== "all" && e.repository !== selectedRepository) {
        return false;
      }
      return true;
    });
  }, [data, selectedEventType, selectedRepository]);

  const handleRowClick = (id: number) => {
    if (selectedEventId === id) {
      onSelectEvent(null);
    } else {
      onSelectEvent(id);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-header-main">
          <h2>Recent Events</h2>
          {loading && <span className="badge badge-info">Loading…</span>}
        </div>
        <div className="panel-filters">
          <div className="filter-group">
            <label className="filter-label" htmlFor="eventTypeFilter">
              Event type
            </label>
            <select
              id="eventTypeFilter"
              className="filter-select"
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
            >
              <option value="all">All types</option>
              {eventTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label" htmlFor="repositoryFilter">
              Repository
            </label>
            <select
              id="repositoryFilter"
              className="filter-select"
              value={selectedRepository}
              onChange={(e) => setSelectedRepository(e.target.value)}
            >
              <option value="all">All repos</option>
              {repositories.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="table-wrapper">
        <table className="table table-clickable">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Repository</th>
              <th>Ref</th>
              <th>Actor</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((e) => {
              const isSelected = selectedEventId === e.id;
              return (
                <tr
                  key={e.id}
                  className={isSelected ? "row-selected" : ""}
                  onClick={() => handleRowClick(e.id)}
                >
                  <td>{e.id}</td>
                  <td>{e.eventType}</td>
                  <td>{e.repository}</td>
                  <td>{e.ref ?? "—"}</td>
                  <td>{e.actor ?? "—"}</td>
                  <td>{formatDate(e.createdAt)}</td>
                </tr>
              );
            })}
            {!loading && filteredData.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  No events match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {selectedEventId && (
        <div className="panel-footer">
          <span className="badge badge-info">
            Showing deliveries for event #{selectedEventId}
          </span>
          <button
            type="button"
            className="link-button"
            onClick={() => onSelectEvent(null)}
          >
            Clear selection
          </button>
        </div>
      )}
    </div>
  );
}

// ----- Deliveries -----

function DeliveriesView(props: { selectedEventId: number | null }) {
  const { selectedEventId } = props;
  const [data, setData] = useState<DeliveryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params =
          selectedEventId != null ? { eventId: selectedEventId } : undefined;
        const res = await api.get<DeliveryDto[]>("/api/deliveries", {
          params,
        });
        if (isMounted) {
          setData(res.data);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load deliveries";
        if (isMounted) {
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [selectedEventId]);

  const statusClass = (status: string) => {
    if (status === "SUCCESS") return "badge-success";
    if (status === "FAILED") return "badge-error";
    return "badge-info";
  };

  const title =
    selectedEventId != null
      ? `Deliveries for event #${selectedEventId}`
      : "Recent Deliveries";

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{title}</h2>
        {loading && <span className="badge badge-info">Loading…</span>}
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Event ID</th>
              <th>Status</th>
              <th>Response</th>
              <th>Error</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.id}>
                <td>{d.id}</td>
                <td>{d.event?.id ?? d.eventId ?? "—"}</td>
                <td>
                  <span className={`badge ${statusClass(d.status)}`}>
                    {d.status}
                  </span>
                </td>
                <td>{d.responseCode ?? "—"}</td>
                <td className="truncate">{d.errorMessage ?? "—"}</td>
                <td>{formatDate(d.createdAt)}</td>
              </tr>
            ))}
            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  No deliveries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ----- Destinations -----

function DestinationsView() {
  const [data, setData] = useState<DestinationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<DestinationDto[]>("/api/destinations");
        if (isMounted) {
          setData(res.data);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load destinations";
        if (isMounted) {
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Destinations</h2>
        {loading && <span className="badge badge-info">Loading…</span>}
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Type</th>
              <th>Enabled</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.id}>
                <td>{d.id}</td>
                <td>{d.name}</td>
                <td>{d.type}</td>
                <td>{d.enabled ? "Yes" : "No"}</td>
                <td>{formatDate(d.createdAt)}</td>
              </tr>
            ))}
            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  No destinations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ----- Routing Rules -----

function RoutingRulesView() {
  const [data, setData] = useState<RoutingRuleDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<RoutingRuleDto[]>("/api/routing-rules");
        if (isMounted) {
          setData(res.data);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load routing rules";
        if (isMounted) {
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Routing Rules</h2>
        {loading && <span className="badge badge-info">Loading…</span>}
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Repository</th>
              <th>Ref</th>
              <th>Event Type</th>
              <th>Destination</th>
              <th>Enabled</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.repository ?? "*any*"}</td>
                <td>{r.ref ?? "*any*"}</td>
                <td>{r.eventType ?? "*any*"}</td>
                <td>{r.destination?.name ?? "—"}</td>
                <td>{r.enabled ? "Yes" : "No"}</td>
                <td>{formatDate(r.createdAt)}</td>
              </tr>
            ))}
            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  No routing rules yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function App() {
  const { user, isLoading, logout } = useAuth();
  const [currentView, setCurrentView] = useState<ViewKey>("events");
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  const handleSelectEvent = (id: number | null) => {
    setSelectedEventId(id);
    if (id != null) {
      setCurrentView("deliveries");
    }
  };

  const renderView = () => {
    switch (currentView) {
      case "events":
        return (
          <EventsView
            selectedEventId={selectedEventId}
            onSelectEvent={handleSelectEvent}
          />
        );
      case "deliveries":
        return <DeliveriesView selectedEventId={selectedEventId} />;
      case "destinations":
        return <DestinationsView />;
      case "routing-rules":
        return <RoutingRulesView />;
      case "admin-destinations":
        return <AdminDestinationsView />;
      case "admin-routing-rules":
        return <AdminRoutingRulesView />;
      case "admin-users":
        return <AdminUsersView />;
      default:
        return (
          <EventsView
            selectedEventId={selectedEventId}
            onSelectEvent={handleSelectEvent}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="app-root">
        <div className="app-loading">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-root">
        <LoginForm />
      </div>
    );
  }

  return (
    <div className="app-root">
      <header className="topbar">
        <div className="topbar-title">Webhook Service Dashboard</div>
        <div className="topbar-right">
          <span className="topbar-user">{user.email}</span>
          <button type="button" className="topbar-logout" onClick={logout}>
            Logout
          </button>
        </div>
      </header>
      <div className="app-layout">
        <nav className="sidebar">
          <button
            className={
              currentView === "events" ? "nav-item active" : "nav-item"
            }
            onClick={() => setCurrentView("events")}
          >
            Events
          </button>
          <button
            className={
              currentView === "deliveries" ? "nav-item active" : "nav-item"
            }
            onClick={() => setCurrentView("deliveries")}
          >
            Deliveries
          </button>
          <button
            className={
              currentView === "destinations" ? "nav-item active" : "nav-item"
            }
            onClick={() => setCurrentView("destinations")}
          >
            Destinations
          </button>
          <button
            className={
              currentView === "routing-rules" ? "nav-item active" : "nav-item"
            }
            onClick={() => setCurrentView("routing-rules")}
          >
            Routing Rules
          </button>

          {user.isAdmin && (
            <>
              <div className="sidebar-section-header">Admin</div>
              <button
                className={
                  currentView === "admin-destinations"
                    ? "nav-item active"
                    : "nav-item"
                }
                onClick={() => setCurrentView("admin-destinations")}
              >
                Destinations (Admin)
              </button>
              <button
                className={
                  currentView === "admin-routing-rules"
                    ? "nav-item active"
                    : "nav-item"
                }
                onClick={() => setCurrentView("admin-routing-rules")}
              >
                Routing Rules (Admin)
              </button>
              <button
                className={
                  currentView === "admin-users" ? "nav-item active" : "nav-item"
                }
                onClick={() => setCurrentView("admin-users")}
              >
                Users (Admin)
              </button>
            </>
          )}
        </nav>
        <main className="content">{renderView()}</main>
      </div>
    </div>
  );
}

export default App;
