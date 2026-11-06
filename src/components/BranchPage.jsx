
import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  Download,
  Eye,
  FilePlus2,
  Pencil,
  Power,
  Search,
  Trash2,
  X
} from 'lucide-react';

import {
  emptySearch,
  getBranches,
  saveBranch,
  deleteBranch,
  readApiResponse
} from './branchService';

import BranchForm from './BranchForm';
import { TopNavigation } from './OrganizationShared';

export default function BranchPage() {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('Select');
  const [applied, setApplied] = useState(emptySearch);
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [formBranchId, setFormBranchId] = useState(null);
  const [formInitialBranch, setFormInitialBranch] = useState(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sort, setSort] = useState({ key: 'code', direction: 'asc' });

  const branchesQuery = useQuery({
    queryKey: ['branches', applied, page, perPage],
    queryFn: getBranches,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000)
  });

  const result = branchesQuery.data || {
    rows: [],
    total: 0,
    totalPages: 1
  };

  const sortedBranches = [...result.rows].sort((first, second) => {
    const comparison = String(first[sort.key] || '').localeCompare(
      String(second[sort.key] || ''),
      undefined,
      { sensitivity: 'base' }
    );

    return sort.direction === 'asc' ? comparison : -comparison;
  });

  const branchStatusMutation = useMutation({
  mutationFn: (branch) => {
    const companyId = Number(branch.companyId ?? branch.company_id);

    if (!Number.isInteger(companyId) || companyId <= 0) {
      throw new Error('Company ID is missing or invalid for this branch.');
    }

    return saveBranch(branch.id, {
      ...branch,
      status: 'Inactive',
      code: branch.code || '',
      name: branch.name || '',
      companyId
    });
  },
  onSuccess: () => {
    setDeleteDialogOpen(false);
    setSelected([]);
    branchesQuery.refetch();
  },
  onError: (requestError) => window.alert(requestError.message)
});

  const branchDeleteMutation = useMutation({
    mutationFn: (branchId) => deleteBranch(branchId),
    onSuccess: () => {
      setDeleteDialogOpen(false);
      setSelected([]);
      branchesQuery.refetch();
    },
    onError: (requestError) => window.alert(requestError.message)
  });

  const updateFilter = (key, value) => {
    setApplied((current) => ({
      ...current,
      [key]: key === 'status' ? value : value.trim()
    }));

    if (key === 'code') setCode(value);
    if (key === 'name') setName(value);
    if (key === 'status') setStatus(value);

    setPage(1);
  };

  const reset = () => {
    setCode('');
    setName('');
    setStatus('Select');
    setApplied(emptySearch);
    setPage(1);
    setSelected([]);
  };

  const selectRow = (branch) => {
    setSelected((current) =>
      current.some((item) => item.id === branch.id) ? [] : [branch]
    );
  };

  const openNewBranch = () => openForm('create');

  const openForm = (mode, branch = null) => {
    setFormMode(mode);
    setFormBranchId(
      mode === 'create' || mode === 'copy' ? null : branch?.id || null
    );
    setFormInitialBranch(branch);
    setShowForm(true);
  };

  const deleteSelected = () => {
    if (!selected.length) return;
    setDeleteDialogOpen(true);
  };

  const markSelectedInactive = () => {
    if (selected[0]) branchStatusMutation.mutate(selected[0]);
  };

  const removeSelected = () => {
    if (selected[0]) branchDeleteMutation.mutate(selected[0].id);
  };

  const downloadBranches = async () => {
    try {
      const response = await fetch(
        '/api/branches?page=1&linesPerPage=10000'
      );

      const exportResult = await readApiResponse(
        response,
        'Unable to export branches'
      );

      const escape = (value) =>
        String(value ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');

      const rows = selected.length ? selected : exportResult.rows;

      const table = `
        <tr>
          <th>Branch Code</th>
          <th>Branch Name</th>
          <th>Company</th>
          <th>Organization</th>
          <th>Status</th>
        </tr>
        ${rows.map((row) => `
          <tr>
            <td>${escape(row.code)}</td>
            <td>${escape(row.name)}</td>
            <td>${escape(row.companyName)}</td>
            <td>${escape(row.organizationName)}</td>
            <td>${escape(row.status)}</td>
          </tr>
        `).join('')}
      `;

      const blob = new Blob(
        [`<html><head><meta charset="UTF-8"></head><body><table>${table}</table></body></html>`],
        { type: 'application/vnd.ms-excel' }
      );

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');

      anchor.href = url;
      anchor.download = 'branches.xls';

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      window.alert(error.message);
    }
  };

  if (showForm) {
    return (
      <BranchForm
        layout="four-4"
        branchId={formBranchId}
        initialBranch={formInitialBranch}
        formMode={formMode}
        readOnly={formMode === 'view'}
        onCancel={() => setShowForm(false)}
        onCreated={() => {
          setShowForm(false);
          branchesQuery.refetch();
          setSelected([]);
        }}
      />
    );
  }

  return (
    <div className="legacy-screen">
      <TopNavigation />

      <header className="brand-bar">
        <strong>150CHF</strong>
        <span>Branches</span>

        <div className="user-meta">
          User: <b>APPADMIN</b>&nbsp;&nbsp;
          Party: <b>APPADMIN</b>&nbsp;&nbsp;
          Role: <b>APPADMIN</b>
        </div>
      </header>

      <div className="action-bar">
        <button
          aria-label="Search"
          title="Search branches"
          onClick={() =>
            document.querySelector('.search-fields input')?.focus()
          }
        >
          <Search size={14} />
        </button>

        <button aria-label="Back" onClick={reset}>↶</button>

        <button
          aria-label="Export branches"
          onClick={downloadBranches}
        >
          <Download size={13} />
        </button>

        {!selected.length && (
          <button
            aria-label="New branch"
            title="Add branch"
            onClick={openNewBranch}
          >
            <FilePlus2 size={13} />
          </button>
        )}

        {selected.length > 0 && (
          <>
            <button
              aria-label="View branch"
              title="View branch"
              onClick={() => openForm('view', selected[0])}
            >
              <Eye size={13} />
            </button>

            <button
              aria-label="Edit branch"
              title="Edit branch"
              onClick={() => openForm('edit', selected[0])}
            >
              <Pencil size={13} />
            </button>

            <button
              aria-label="Copy branch"
              title="Copy branch"
              type="button"
              onClick={() => openForm('copy', selected[0])}
            >
              <Copy size={13} />
            </button>

            <button
              aria-label="Delete branch"
              title="Delete branch"
              onClick={deleteSelected}
            >
              <Trash2 size={13} />
            </button>
          </>
        )}

        <button
          className="toolbar-power"
          aria-label="Power"
          type="button"
        >
          <Power size={13} />
        </button>
      </div>

      <main>
        <section className="summary-box">
          <div className="section-title">
            <ClipboardList size={13} /> Summary
          </div>

          <div className="summary-grid">
            <span>Code</span>
            <span>Name</span>
            <span>Status</span>
          </div>

          {selected.map((branch) => (
            <div className="summary-values" key={branch.id}>
              <b>{branch.code}</b>
              <b>{branch.name}</b>
              <b>{branch.status}</b>
            </div>
          ))}
        </section>

        <section className="search-box">
          <div className="search-fields">
            <label>
              Branch Code
              <input
                value={code}
                onChange={(event) =>
                  updateFilter('code', event.target.value)
                }
              />
            </label>

            <label>
              Name
              <input
                value={name}
                onChange={(event) =>
                  updateFilter('name', event.target.value)
                }
              />
            </label>

            <label>
              Status
              <select
                value={status}
                onChange={(event) =>
                  updateFilter('status', event.target.value)
                }
              >
                <option>Select</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </label>
          </div>
        </section>

        <section className="table-box">
          <table>
            <thead>
              <tr>
                {[
                  ['code', 'Branch Code'],
                  ['name', 'Name'],
                  ['companyName', 'Company'],
                  ['organizationName', 'Organization'],
                  ['status', 'Status']
                ].map(([key, label]) => (
                  <th
                    key={key}
                    aria-sort={
                      sort.key === key
                        ? `${sort.direction}ending`
                        : 'none'
                    }
                  >
                    <button
                      className="sort-header"
                      type="button"
                      onClick={() =>
                        setSort((current) => ({
                          key,
                          direction:
                            current.key === key &&
                            current.direction === 'asc'
                              ? 'desc'
                              : 'asc'
                        }))
                      }
                    >
                      {label}
                      <i>
                        {sort.key === key && sort.direction === 'desc'
                          ? '▼'
                          : '▲'}
                      </i>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {branchesQuery.isLoading && (
                <tr>
                  <td className="empty" colSpan="5">
                    Loading branches...
                  </td>
                </tr>
              )}

              {branchesQuery.isError && (
                <tr>
                  <td className="empty error" colSpan="5">
                    {branchesQuery.error.message}
                  </td>
                </tr>
              )}

              {!branchesQuery.isLoading &&
                !branchesQuery.isError &&
                sortedBranches.map((branch) => (
                  <tr
                    key={branch.id}
                    onClick={() => selectRow(branch)}
                    className={
                      selected.some((item) => item.id === branch.id)
                        ? 'selected-row'
                        : ''
                    }
                  >
                    <td>{branch.code}</td>
                    <td>{branch.name}</td>
                    <td>{branch.companyName || '-'}</td>
                    <td>{branch.organizationName || '-'}</td>
                    <td>{branch.status}</td>
                  </tr>
                ))}

              {!branchesQuery.isLoading &&
                !branchesQuery.isError &&
                !result.rows.length && (
                  <tr>
                    <td className="empty" colSpan="5">
                      No matching branches found
                    </td>
                  </tr>
                )}
            </tbody>
          </table>

          <footer className="table-footer">
            <em>♧ Click a row to select</em>

            <div className="pager">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
              >
                |‹
              </button>

              <button
                onClick={() =>
                  setPage((value) => Math.max(1, value - 1))
                }
                disabled={page === 1}
              >
                <ChevronLeft size={12} />
              </button>

              <b>{page}</b>
              <span>/ {result.totalPages}</span>

              <button
                onClick={() =>
                  setPage((value) =>
                    Math.min(result.totalPages, value + 1)
                  )
                }
                disabled={page === result.totalPages}
              >
                <ChevronRight size={12} />
              </button>

              <span className="divider">|</span>

              <label>
                Lines per Page
                <select
                  value={perPage}
                  onChange={(event) => {
                    setPerPage(Number(event.target.value));
                    setPage(1);
                  }}
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                </select>
              </label>
            </div>
          </footer>
        </section>
      </main>

      {deleteDialogOpen && selected[0] && (
        <div className="modal-backdrop delete-dialog-backdrop">
          <section
            className="delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <div className="delete-dialog-icon">
              <AlertTriangle size={25} />
            </div>

            <h2 id="delete-title">Delete</h2>

            <p>
              Do you really want to In-active/Delete this record?
            </p>

            <div className="delete-dialog-actions">
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(false)}
              >
                <X size={13} /> No
              </button>

              <button
                className="inactive-action"
                type="button"
                disabled={
                  branchStatusMutation.isPending ||
                  branchDeleteMutation.isPending
                }
                onClick={markSelectedInactive}
              >
                In-Active
              </button>

              <button
                className="delete-confirm"
                type="button"
                disabled={
                  branchStatusMutation.isPending ||
                  branchDeleteMutation.isPending
                }
                onClick={removeSelected}
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
