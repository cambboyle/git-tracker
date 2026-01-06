import { useEffect, useState } from "react";
import { api } from "./api";

type AdminUserDto = {
  id: number;
  email: string;
  isAdmin: boolean;
  createdAt?: string;
};

type UserFormState = {
  email: string;
  password: string;
  isAdmin: boolean;
};

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleString();
}

export function AdminUsersView() {
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<UserFormState>({
    email: "",
    password: "",
    isAdmin: false,
  });

  const [editing, setEditing] = useState<AdminUserDto | null>(null);

  const resetForm = () => {
    setForm({
      email: "",
      password: "",
      isAdmin: false,
    });
    setEditing(null);
  };

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<AdminUserDto[]>("/api/admin/users");
      setUsers(res.data);
    } catch (err: any) {
      const message = err?.response?.data?.message ?? "Failed to load users";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      if (editing) {
        await api.patch(`/api/admin/users/${editing.id}`, {
          email: form.email,
          password: form.password || undefined,
          isAdmin: form.isAdmin,
        });
      } else {
        await api.post("/api/admin/users", {
          email: form.email,
          password: form.password,
          isAdmin: form.isAdmin,
        });
      }

      resetForm();
      await loadUsers();
    } catch (err: any) {
      const message = err?.response?.data?.message ?? "Failed to save user";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (u: AdminUserDto) => {
    setEditing(u);
    setForm({
      email: u.email,
      password: "",
      isAdmin: u.isAdmin,
    });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this user?")) return;
    setError(null);
    try {
      await api.delete(`/api/admin/users/${id}`);
      if (editing && editing.id === id) {
        resetForm();
      }
      await loadUsers();
    } catch (err: any) {
      const message = err?.response?.data?.message ?? "Failed to delete user";
      setError(message);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Admin: Users</h2>
        {loading && <span className="badge badge-info">Loading…</span>}
        {saving && <span className="badge badge-info">Saving…</span>}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="panel-content admin-layout">
        <section className="admin-form-section">
          <form className="admin-form" onSubmit={handleSubmit}>
            <h3>{editing ? `Edit User #${editing.id}` : "Create User"}</h3>

            <div className="form-row">
              <label htmlFor="user-email">Email</label>
              <input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
                required
              />
            </div>

            <div className="form-row">
              <label htmlFor="user-password">
                Password {editing && "(leave blank to keep)"}
              </label>
              <input
                id="user-password"
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, password: e.target.value }))
                }
                required={!editing}
              />
            </div>

            <div className="form-row form-row-inline">
              <label>
                <input
                  type="checkbox"
                  checked={form.isAdmin}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      isAdmin: e.target.checked,
                    }))
                  }
                />{" "}
                Admin
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={saving}>
                {editing ? "Update User" : "Create User"}
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
                  <th>Email</th>
                  <th>Admin</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.email}</td>
                    <td>{u.isAdmin ? "Yes" : "No"}</td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => startEdit(u)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => handleDelete(u.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty">
                      No users found.
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
