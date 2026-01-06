import { useEffect, useState } from "react";
import { api } from "./api";

type DestinationDto = {
  id: number;
  name: string;
  type: string;
  enabled: boolean;
  createdAt?: string;
  // Catch-all for any extra fields (e.g. config, webhook URL, etc.)
  [key: string]: unknown;
};

type DestinationFormState = {
  name: string;
  type: string;
  enabled: boolean;
  // Generic JSON config editor as string; you can map this to a real field later
  configText: string;
};

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  // If invalid date, just show original
  return isNaN(d.getTime()) ? value : d.toLocaleString();
}

export function AdminDestinationsView() {
  const [destinations, setDestinations] = useState<DestinationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<DestinationFormState>({
    name: "",
    type: "",
    enabled: true,
    configText: "",
  });

  const [editing, setEditing] = useState<DestinationDto | null>(null);

  const resetForm = () => {
    setForm({
      name: "",
      type: "",
      enabled: true,
      configText: "",
    });
    setEditing(null);
  };

  const loadDestinations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<DestinationDto[]>("/api/admin/destinations");
      setDestinations(res.data);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? "Failed to load destinations";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDestinations();
  }, []);

  const parseConfig = (): unknown | undefined => {
    const text = form.configText.trim();
    if (!text) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Config must be valid JSON");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let parsedConfig: unknown | undefined;
    try {
      parsedConfig = parseConfig();
    } catch (err: any) {
      setError(err.message ?? "Invalid config JSON");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/api/admin/destinations/${editing.id}`, {
          name: form.name,
          type: form.type,
          enabled: form.enabled,
          config: parsedConfig,
        });
      } else {
        await api.post("/api/admin/destinations", {
          name: form.name,
          type: form.type,
          enabled: form.enabled,
          config: parsedConfig,
        });
      }

      resetForm();
      await loadDestinations();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? "Failed to save destination";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (d: DestinationDto) => {
    const config = (d as any).config;
    const configText =
      config !== undefined ? JSON.stringify(config, null, 2) : "";
    setEditing(d);
    setForm({
      name: d.name,
      type: d.type,
      enabled: d.enabled,
      configText,
    });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this destination?")) return;
    setError(null);
    try {
      await api.delete(`/api/admin/destinations/${id}`);
      if (editing && editing.id === id) {
        resetForm();
      }
      await loadDestinations();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? "Failed to delete destination";
      setError(message);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Admin: Destinations</h2>
        {loading && <span className="badge badge-info">Loading…</span>}
        {saving && <span className="badge badge-info">Saving…</span>}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="panel-content admin-layout">
        <section className="admin-form-section">
          <form className="admin-form" onSubmit={handleSubmit}>
            <h3>
              {editing
                ? `Edit Destination #${editing.id}`
                : "Create Destination"}
            </h3>

            <div className="form-row">
              <label htmlFor="dest-name">Name</label>
              <input
                id="dest-name"
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>

            <div className="form-row">
              <label htmlFor="dest-type">Type</label>
              <input
                id="dest-type"
                type="text"
                value={form.type}
                placeholder="e.g. slack, discord"
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, type: e.target.value }))
                }
                required
              />
            </div>

            <div className="form-row form-row-inline">
              <label>
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      enabled: e.target.checked,
                    }))
                  }
                />{" "}
                Enabled
              </label>
            </div>

            <div className="form-row">
              <label htmlFor="dest-config">Config (JSON)</label>
              <textarea
                id="dest-config"
                value={form.configText}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, configText: e.target.value }))
                }
                placeholder='e.g. { "webhookUrl": "https://..." }'
                rows={6}
              />
              <small className="field-help">
                Optional: JSON configuration object for this destination.
              </small>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={saving}>
                {editing ? "Update Destination" : "Create Destination"}
              </button>
              {editing && (
                <button
                  type="button"
                  className="link-button"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="admin-table-section">
          <div className="table-wrapper">
            <table className="table table-clickable">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Enabled</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {destinations.map((d) => (
                  <tr key={d.id}>
                    <td>{d.id}</td>
                    <td>{d.name}</td>
                    <td>{d.type}</td>
                    <td>{d.enabled ? "Yes" : "No"}</td>
                    <td>{formatDate(d.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => startEdit(d)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => handleDelete(d.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && destinations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty">
                      No destinations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
