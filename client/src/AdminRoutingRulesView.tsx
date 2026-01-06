import { useEffect, useState } from "react";
import { api } from "./api";

type DestinationSummary = {
  id: number;
  name: string;
};

type RoutingRuleDto = {
  id: number;
  repository: string | null;
  ref: string | null;
  eventType: string | null;
  enabled: boolean;
  destination: DestinationSummary | null;
  createdAt?: string;
};

type RoutingRuleFormState = {
  repository: string;
  ref: string;
  eventType: string;
  enabled: boolean;
  destinationId: string; // keep as string for <select>
};

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleString();
}

export function AdminRoutingRulesView() {
  const [rules, setRules] = useState<RoutingRuleDto[]>([]);
  const [destinations, setDestinations] = useState<DestinationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<RoutingRuleFormState>({
    repository: "",
    ref: "",
    eventType: "",
    enabled: true,
    destinationId: "",
  });

  const [editing, setEditing] = useState<RoutingRuleDto | null>(null);

  const resetForm = () => {
    setForm({
      repository: "",
      ref: "",
      eventType: "",
      enabled: true,
      destinationId: "",
    });
    setEditing(null);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rulesRes, destsRes] = await Promise.all([
        api.get<RoutingRuleDto[]>("/api/admin/routing-rules"),
        api.get<DestinationSummary[]>("/api/admin/destinations"),
      ]);
      setRules(rulesRes.data);
      setDestinations(destsRes.data);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? "Failed to load routing rules";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.destinationId) {
      setError("Destination is required");
      return;
    }

    const destinationId = Number(form.destinationId);
    if (Number.isNaN(destinationId)) {
      setError("Destination is invalid");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        repository: form.repository || null,
        ref: form.ref || null,
        eventType: form.eventType || null,
        enabled: form.enabled,
        destinationId,
      };

      if (editing) {
        await api.patch(`/api/admin/routing-rules/${editing.id}`, payload);
      } else {
        await api.post("/api/admin/routing-rules", payload);
      }

      resetForm();
      await loadData();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? "Failed to save routing rule";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (rule: RoutingRuleDto) => {
    setEditing(rule);
    setForm({
      repository: rule.repository ?? "",
      ref: rule.ref ?? "",
      eventType: rule.eventType ?? "",
      enabled: rule.enabled,
      destinationId: rule.destination ? String(rule.destination.id) : "",
    });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this routing rule?")) return;
    setError(null);
    try {
      await api.delete(`/api/admin/routing-rules/${id}`);
      if (editing && editing.id === id) {
        resetForm();
      }
      await loadData();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? "Failed to delete routing rule";
      setError(message);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Admin: Routing Rules</h2>
        {loading && <span className="badge badge-info">Loading…</span>}
        {saving && <span className="badge badge-info">Saving…</span>}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="panel-content admin-layout">
        <section className="admin-form-section">
          <form className="admin-form" onSubmit={handleSubmit}>
            <h3>{editing ? `Edit Rule #${editing.id}` : "Create Rule"}</h3>

            <div className="form-row">
              <label htmlFor="rule-repo">Repository (optional)</label>
              <input
                id="rule-repo"
                type="text"
                placeholder="owner/repo or blank for any"
                value={form.repository}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, repository: e.target.value }))
                }
              />
            </div>

            <div className="form-row">
              <label htmlFor="rule-ref">Ref (optional)</label>
              <input
                id="rule-ref"
                type="text"
                placeholder="refs/heads/main or blank for any"
                value={form.ref}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, ref: e.target.value }))
                }
              />
            </div>

            <div className="form-row">
              <label htmlFor="rule-event">Event type (optional)</label>
              <input
                id="rule-event"
                type="text"
                placeholder="push, pull_request, issues, etc."
                value={form.eventType}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, eventType: e.target.value }))
                }
              />
            </div>

            <div className="form-row">
              <label htmlFor="rule-destination">Destination</label>
              <select
                id="rule-destination"
                value={form.destinationId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    destinationId: e.target.value,
                  }))
                }
                required
              >
                <option value="">Select a destination…</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} (#{d.id})
                  </option>
                ))}
              </select>
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

            <div className="form-actions">
              <button type="submit" disabled={saving}>
                {editing ? "Update Rule" : "Create Rule"}
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
                  <th>Repository</th>
                  <th>Ref</th>
                  <th>Event Type</th>
                  <th>Destination</th>
                  <th>Enabled</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.repository ?? "*any*"}</td>
                    <td>{r.ref ?? "*any*"}</td>
                    <td>{r.eventType ?? "*any*"}</td>
                    <td>
                      {r.destination
                        ? `${r.destination.name} (#${r.destination.id})`
                        : "—"}
                    </td>
                    <td>{r.enabled ? "Yes" : "No"}</td>
                    <td>{formatDate(r.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => startEdit(r)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => handleDelete(r.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && rules.length === 0 && (
                  <tr>
                    <td colSpan={8} className="empty">
                      No routing rules defined.
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
