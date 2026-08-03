import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  addManagedGroup,
  addManagedUser,
  getRacfManagedState,
  removeManagedGroup,
  removeManagedUser,
  triggerRacfRebuild,
  updateMembership,
} from "../services/api";
import type {
  AddManagedGroupPayload,
  AddManagedUserPayload,
  AutomationRunDispatchResponse,
  RacfManagedStateResponse,
  UpdateMembershipPayload,
} from "../types/api";

const INITIAL_ADD_USER: AddManagedUserPayload = {
  userid: "",
  group: "",
  access: "ALTER",
};

const INITIAL_ADD_GROUP: AddManagedGroupPayload = {
  name: "",
  owner: "IBMUSER",
  superior_group: "SYS1",
  gid: 9000,
};

const INITIAL_MEMBERSHIP: UpdateMembershipPayload = {
  userid: "",
  group: "",
};

function rebuildMessage(result: AutomationRunDispatchResponse | undefined): string {
  if (!result) {
    return "No rebuild response available.";
  }

  if (result.run_id) {
    return `Queued rebuild run ${result.run_id}.`;
  }

  return "Queued rebuild run.";
}

export function RacfManagementPage() {
  const [stateResponse, setStateResponse] = useState<RacfManagedStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [addUserForm, setAddUserForm] = useState(INITIAL_ADD_USER);
  const [addGroupForm, setAddGroupForm] = useState(INITIAL_ADD_GROUP);
  const [membershipForm, setMembershipForm] = useState(INITIAL_MEMBERSHIP);

  const etag = stateResponse?.etag ?? undefined;

  const groupedUsers = useMemo(() => {
    if (!stateResponse) {
      return [] as Array<{ group: string; users: string[] }>;
    }

    return Object.entries(stateResponse.state.users)
      .map(([group, users]) => ({ group, users: [...users].sort() }))
      .sort((a, b) => a.group.localeCompare(b.group));
  }, [stateResponse]);

  async function loadState() {
    setLoading(true);
    setError(null);

    try {
      const result = await getRacfManagedState();
      setStateResponse(result);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to load RACF managed state";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadState();
  }, []);

  async function runAction(
    action: () => Promise<RacfManagedStateResponse>,
    successPrefix: string,
  ) {
    setActionLoading(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const result = await action();
      setStateResponse(result);
      setActionMessage(
        `${successPrefix} ${rebuildMessage(result.rebuild)}`,
      );
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Action failed";
      setActionError(message);
    } finally {
      setActionLoading(false);
    }
  }

  async function onAddUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await runAction(
      () => addManagedUser(addUserForm, etag),
      `Added user ${addUserForm.userid.toUpperCase()}.`,
    );

    setAddUserForm(INITIAL_ADD_USER);
  }

  async function onAddGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await runAction(
      () => addManagedGroup(addGroupForm, etag),
      `Added group ${addGroupForm.name}.`,
    );

    setAddGroupForm(INITIAL_ADD_GROUP);
  }

  async function onUpdateMembership(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await runAction(
      () => updateMembership(membershipForm, etag),
      `Updated user ${membershipForm.userid.toUpperCase()} membership.`,
    );

    setMembershipForm(INITIAL_MEMBERSHIP);
  }

  async function onRemoveUser(userid: string) {
    await runAction(
      () => removeManagedUser(userid, etag),
      `Removed user ${userid}.`,
    );
  }

  async function onRemoveGroup(groupName: string) {
    await runAction(
      () => removeManagedGroup(groupName, etag),
      `Removed group ${groupName}.`,
    );
  }

  async function onTriggerRebuild() {
    setActionLoading(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const result = await triggerRacfRebuild();
      setActionMessage(rebuildMessage(result));
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Failed to trigger RACF rebuild";
      setActionError(message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading && stateResponse === null) {
    return (
      <main className="page">
        <p className="state-message">Loading managed RACF state...</p>
      </main>
    );
  }

  if (error && stateResponse === null) {
    return (
      <main className="page">
        <section className="error-panel">
          <h1>Unable to load RACF managed state</h1>
          <p>{error}</p>

          <button type="button" onClick={() => void loadState()}>
            Try again
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Team 03 Operations Portal</p>
          <h1>RACF Management</h1>
          <p className="page-description">
            Manage users, groups, and memberships backed by S3-managed state.
            Each change queues a RACF rebuild workflow.
          </p>
        </div>

        <div className="page-actions">
          <label htmlFor="refresh">State actions</label>
          <button id="refresh" type="button" onClick={() => void loadState()} disabled={actionLoading}>
            Refresh
          </button>
          <button type="button" onClick={() => void onTriggerRebuild()} disabled={actionLoading}>
            Trigger rebuild
          </button>
        </div>
      </header>

      {actionError && <div className="warning-banner">Action failed: {actionError}</div>}
      {actionMessage && <div className="warning-banner">{actionMessage}</div>}

      <section className="automation-grid">
        <div className="automation-panel">
          <h2>Managed Groups</h2>
          <p>Total: {stateResponse?.state.racf_groups.length ?? 0}</p>
          {stateResponse?.state.racf_groups.map((group) => (
            <p key={group.identity.name}>
              {group.identity.name} (owner {group.hierarchy.owner}, superior {group.hierarchy.superior_group}, gid {group.omvs.gid}){" "}
              <button
                type="button"
                onClick={() => void onRemoveGroup(group.identity.name)}
                disabled={actionLoading}
              >
                Remove
              </button>
            </p>
          ))}

          <form className="automation-form" onSubmit={onAddGroup}>
            <h2>Add Group</h2>
            <label htmlFor="group-name">Group name</label>
            <input
              id="group-name"
              value={addGroupForm.name}
              onChange={(event) => {
                setAddGroupForm((previous) => ({ ...previous, name: event.target.value.toUpperCase() }));
              }}
              required
            />
            <label htmlFor="group-owner">Owner</label>
            <input
              id="group-owner"
              value={addGroupForm.owner}
              onChange={(event) => {
                setAddGroupForm((previous) => ({ ...previous, owner: event.target.value.toUpperCase() }));
              }}
              required
            />
            <label htmlFor="group-superior">Superior group</label>
            <input
              id="group-superior"
              value={addGroupForm.superior_group}
              onChange={(event) => {
                setAddGroupForm((previous) => ({ ...previous, superior_group: event.target.value.toUpperCase() }));
              }}
              required
            />
            <label htmlFor="group-gid">GID</label>
            <input
              id="group-gid"
              type="number"
              value={addGroupForm.gid}
              onChange={(event) => {
                setAddGroupForm((previous) => ({ ...previous, gid: Number.parseInt(event.target.value, 10) || 0 }));
              }}
              required
            />
            <button type="submit" disabled={actionLoading}>Add group</button>
          </form>
        </div>

        <div className="automation-panel">
          <h2>Managed Users</h2>
          <p>Total: {stateResponse?.managed_users.length ?? 0}</p>
          {groupedUsers.map((entry) => (
            <div key={entry.group}>
              <h3>{entry.group}</h3>
              {entry.users.length === 0 ? (
                <p>No users mapped.</p>
              ) : (
                entry.users.map((userid) => (
                  <p key={`${entry.group}-${userid}`}>
                    {userid}{" "}
                    <button
                      type="button"
                      onClick={() => void onRemoveUser(userid)}
                      disabled={actionLoading}
                    >
                      Remove
                    </button>
                  </p>
                ))
              )}
            </div>
          ))}

          <form className="automation-form" onSubmit={onAddUser}>
            <h2>Add User</h2>
            <label htmlFor="userid">User ID</label>
            <input
              id="userid"
              value={addUserForm.userid}
              onChange={(event) => {
                setAddUserForm((previous) => ({ ...previous, userid: event.target.value.toUpperCase() }));
              }}
              required
            />
            <label htmlFor="user-group">Group</label>
            <input
              id="user-group"
              value={addUserForm.group}
              onChange={(event) => {
                setAddUserForm((previous) => ({ ...previous, group: event.target.value.toUpperCase() }));
              }}
              required
            />
            <label htmlFor="user-access">Dataset access</label>
            <select
              id="user-access"
              value={addUserForm.access}
              onChange={(event) => {
                setAddUserForm((previous) => ({ ...previous, access: event.target.value }));
              }}
            >
              <option value="ALTER">ALTER</option>
              <option value="UPDATE">UPDATE</option>
              <option value="READ">READ</option>
              <option value="CONTROL">CONTROL</option>
            </select>
            <button type="submit" disabled={actionLoading}>Add user</button>
          </form>

          <form className="automation-form" onSubmit={onUpdateMembership}>
            <h2>Update Membership</h2>
            <label htmlFor="move-userid">User ID</label>
            <input
              id="move-userid"
              value={membershipForm.userid}
              onChange={(event) => {
                setMembershipForm((previous) => ({ ...previous, userid: event.target.value.toUpperCase() }));
              }}
              required
            />
            <label htmlFor="move-group">New Group</label>
            <input
              id="move-group"
              value={membershipForm.group}
              onChange={(event) => {
                setMembershipForm((previous) => ({ ...previous, group: event.target.value.toUpperCase() }));
              }}
              required
            />
            <button type="submit" disabled={actionLoading}>Move user</button>
          </form>
        </div>
      </section>
    </main>
  );
}
