
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Building2,
  ClipboardList,
  MapPin,
  Phone,
  Power,
  Search,
  X
} from 'lucide-react';

import {
  emptyBranch,
  createBranch,
  saveBranch,
  getBranch,
  getOrganizations,
  getCompanies,
  getCountries,
  getStates,
  getCities
} from './branchService';

import {
  OrganizationDialog,
  TopNavigation
} from './OrganizationShared';

function BranchForm({
  onCancel,
  onCreated,
  layout,
  branchId,
  initialBranch,
  formMode,
  readOnly = false
}) {
  const [form, setForm] = useState({
    ...emptyBranch,
    ...initialBranch
  });

  const [originalForm, setOriginalForm] = useState({
    ...emptyBranch,
    ...initialBranch
  });

  const [error, setError] = useState('');
  const [locationError, setLocationError] = useState('');

  const [lookup, setLookup] = useState(null);
  const [lookupCodeSearch, setLookupCodeSearch] = useState('');
  const [lookupNameSearch, setLookupNameSearch] = useState('');
  const [lookupStatus, setLookupStatus] = useState('Select');
  const [lookupPage, setLookupPage] = useState(1);
  const [lookupPageSize, setLookupPageSize] = useState(5);

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const [dialog, setDialog] = useState(null);

  const isReadOnly = readOnly || formMode === 'view';

  // --------------------------------------------------
  // Load organizations
  // --------------------------------------------------

  const organizationsQuery = useQuery({
    queryKey: ['branch-organizations'],
    queryFn: getOrganizations,
    refetchOnWindowFocus: false
  });

  const organizations = organizationsQuery.data || [];

  // --------------------------------------------------
  // Load companies for the selected organization
  // --------------------------------------------------

  const companiesQuery = useQuery({
    queryKey: ['branch-companies', form.organizationId],
    queryFn: () => getCompanies(form.organizationId),
    enabled: Boolean(form.organizationId),
    refetchOnWindowFocus: false
  });

  const companies = companiesQuery.data || [];

  // --------------------------------------------------
  // Load location master data
  // --------------------------------------------------

  useEffect(() => {
    getCountries()
      .then(setCountries)
      .catch((requestError) => {
        setLocationError(requestError.message);
      });
  }, []);

  useEffect(() => {
    if (!form.countryId) {
      setStates([]);
      return;
    }

    getStates(form.countryId)
      .then(setStates)
      .catch((requestError) => {
        setLocationError(requestError.message);
      });
  }, [form.countryId]);

  useEffect(() => {
    if (!form.stateId) {
      setCities([]);
      return;
    }

    getCities(form.stateId)
      .then(setCities)
      .catch((requestError) => {
        setLocationError(requestError.message);
      });
  }, [form.stateId]);

  const selectedCountry = countries.find(
    (item) => String(item.id) === String(form.countryId)
  );

  const selectedState = states.find(
    (item) => String(item.id) === String(form.stateId)
  );

  const selectedCity = cities.find(
    (item) => String(item.id) === String(form.cityId)
  );

  // --------------------------------------------------
  // Load existing branch
  // --------------------------------------------------

  const branchQuery = useQuery({
    queryKey: ['branch', branchId],
    queryFn: () => getBranch(branchId),
    enabled: Boolean(branchId),
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (branchQuery.data) {
      const loadedBranch = {
        ...emptyBranch,
        ...branchQuery.data,
        organizationId: branchQuery.data.organizationId ?? '',
        companyId: branchQuery.data.companyId ?? '',
        branchTypeId: branchQuery.data.branchTypeId ?? '',
        countryId: branchQuery.data.countryId ?? '',
        stateId: branchQuery.data.stateId ?? '',
        cityId: branchQuery.data.cityId ?? ''
      };

      setForm(loadedBranch);
      setOriginalForm(loadedBranch);
    }
  }, [branchQuery.data]);

  useEffect(() => {
    if (branchQuery.error) {
      setError(branchQuery.error.message);

      setDialog({
        type: 'error',
        message: branchQuery.error.message
      });
    }
  }, [branchQuery.error]);

  // --------------------------------------------------
  // Save branch
  // --------------------------------------------------

  const branchMutation = useMutation({
    mutationFn: ({ id, branch }) =>
      id
        ? saveBranch(id, branch)
        : createBranch(branch),

    onSuccess: () => {
      onCreated?.();
    },

    onError: (requestError) => {
      setError(requestError.message);

      setDialog({
        type: 'error',
        message: requestError.message
      });
    }
  });

  // --------------------------------------------------
  // Form updates
  // --------------------------------------------------

  const update = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value
    }));
  };

  const updateOrganization = (organization) => {
    setForm((current) => ({
      ...current,
      organizationId: String(organization.id),
      companyId: ''
    }));

    setLookup(null);
  };

  const updateCompany = (company) => {
    setForm((current) => ({
      ...current,
      companyId: String(company.id)
    }));

    setLookup(null);
  };

  const updateCountry = (country) => {
    setForm((current) => ({
      ...current,
      countryId: String(country.id),
      stateId: '',
      cityId: ''
    }));

    setStates([]);
    setCities([]);
    setLookup(null);
  };

  const updateState = (state) => {
    setForm((current) => ({
      ...current,
      stateId: String(state.id),
      cityId: ''
    }));

    setCities([]);
    setLookup(null);
  };

  const updateCity = (city) => {
    setForm((current) => ({
      ...current,
      cityId: String(city.id)
    }));

    setLookup(null);
  };

  // --------------------------------------------------
  // Lookup popup
  // --------------------------------------------------

  const lookupOptions = useMemo(() => {
    switch (lookup) {
      case 'organization':
        return organizations;

      case 'company':
        return companies;

      case 'country':
        return countries;

      case 'state':
        return states;

      case 'city':
        return cities;

      default:
        return [];
    }
  }, [
    lookup,
    organizations,
    companies,
    countries,
    states,
    cities
  ]);

  const lookupTitle = lookup
    ? lookup.charAt(0).toUpperCase() + lookup.slice(1)
    : '';

  const filteredLookupOptions = useMemo(() => {
    return [...lookupOptions]
      .filter((item) => {
        const code = String(item.code || '').toLowerCase();
        const name = String(item.name || '').toLowerCase();
        const status = String(item.status || '');

        return (
          code.includes(lookupCodeSearch.toLowerCase()) &&
          name.includes(lookupNameSearch.toLowerCase()) &&
          (
            lookupStatus === 'Select' ||
            status.toLowerCase() === lookupStatus.toLowerCase()
          )
        );
      })
      .sort((first, second) =>
        String(first.name || '').localeCompare(
          String(second.name || '')
        )
      );
  }, [
    lookupOptions,
    lookupCodeSearch,
    lookupNameSearch,
    lookupStatus
  ]);

  const lookupTotalPages = Math.max(
    1,
    Math.ceil(filteredLookupOptions.length / lookupPageSize)
  );

  const visibleLookupOptions = filteredLookupOptions.slice(
    (lookupPage - 1) * lookupPageSize,
    lookupPage * lookupPageSize
  );

  const openLookup = (type) => {
    if (type === 'company' && !form.organizationId) {
      setError('Please select an Organization first.');
      return;
    }

    if (type === 'state' && !form.countryId) return;
    if (type === 'city' && !form.stateId) return;

    setLookup(type);
    setLookupCodeSearch('');
    setLookupNameSearch('');
    setLookupStatus('Select');
    setLookupPage(1);
    setLookupPageSize(5);
    setError('');
  };

  const chooseLookupItem = (item) => {
    switch (lookup) {
      case 'organization':
        updateOrganization(item);
        break;

      case 'company':
        updateCompany(item);
        break;

      case 'country':
        updateCountry(item);
        break;

      case 'state':
        updateState(item);
        break;

      case 'city':
        updateCity(item);
        break;

      default:
        break;
    }
  };

  // --------------------------------------------------
  // Lookup fields
  // --------------------------------------------------

  const lookupField = (
    label,
    value,
    type,
    required = false,
    disabled = false
  ) => (
    <label className="lookup-field">
      <span>
        {label}
        {required && <span className="required"> *</span>}
      </span>

      <div>
        <input
          readOnly
          disabled={isReadOnly || disabled}
          placeholder="Search or select"
          value={value || ''}
          onChange={() => {}}
        />

        <button
          disabled={isReadOnly || disabled}
          type="button"
          aria-label={`Search ${label}`}
          onClick={() => openLookup(type)}
        >
          <Search size={12} />
        </button>
      </div>
    </label>
  );

  // --------------------------------------------------
  // Regular fields
  // --------------------------------------------------

  const field = (
    label,
    key,
    required = false,
    type = 'text'
  ) => (
    <label>
      <span className="field-label">
        {label}
        {required && <span className="required"> *</span>}
      </span>

      <input
        readOnly={isReadOnly}
        required={required}
        type={type}
        value={form[key] ?? ''}
        onChange={update(key)}
      />
    </label>
  );

  // --------------------------------------------------
  // Validation
  // --------------------------------------------------

  const validate = () => {
    if (!String(form.code || '').trim()) {
      setError('Branch Code is required.');
      return false;
    }

    if (!String(form.name || '').trim()) {
      setError('Branch Name is required.');
      return false;
    }

    if (!form.companyId) {
      setError('Please select a Company.');
      return false;
    }

    if (
      form.managerEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.managerEmail)
    ) {
      setError('Enter a valid Manager Email.');
      return false;
    }

    if (
      form.managerPhone &&
      !/^[+\d][\d\s().-]{6,24}$/.test(form.managerPhone)
    ) {
      setError('Enter a valid Manager Phone.');
      return false;
    }

    setError('');
    return true;
  };

  // --------------------------------------------------
  // Submit and confirmation
  // --------------------------------------------------

  const submit = (event) => {
    event?.preventDefault();

    if (isReadOnly) return;

    if (!validate()) return;

    setDialog({
      type: 'confirm',
      message: branchId
        ? 'Are you sure you want to update this Branch?'
        : 'Are you sure you want to create this Branch?'
    });
  };

  const confirmSave = () => {
    setDialog(null);

    const branch = {
      ...form,
      organizationId: form.organizationId
        ? Number(form.organizationId)
        : null,
      companyId: form.companyId
        ? Number(form.companyId)
        : null,
      branchTypeId: form.branchTypeId
        ? Number(form.branchTypeId)
        : null,
      countryId: form.countryId
        ? Number(form.countryId)
        : null,
      stateId: form.stateId
        ? Number(form.stateId)
        : null,
      cityId: form.cityId
        ? Number(form.cityId)
        : null
    };

    branchMutation.mutate({
      id: branchId,
      branch
    });
  };

  const requestCancel = () => {
    if (
      isReadOnly ||
      JSON.stringify(form) === JSON.stringify(originalForm)
    ) {
      onCancel?.();
      return;
    }

    setDialog({
      type: 'discard'
    });
  };

  const discardChanges = () => {
    setForm(originalForm);
    setDialog(null);
    onCancel?.();
  };

  const loading =
    branchQuery.isLoading ||
    organizationsQuery.isLoading;

  const selectedOrganization = organizations.find(
    (item) =>
      String(item.id) === String(form.organizationId)
  );

  const selectedCompany = companies.find(
    (item) =>
      String(item.id) === String(form.companyId)
  );

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <div
      className={`legacy-screen ${
        layout === 'four-4' ? 'detailed-create-screen' : ''
      } ${loading ? 'form-loading' : ''}`}
    >
      <TopNavigation />

      <header className="brand-bar">
        <strong>150CHF</strong>

        <span>
          Branch - {
            isReadOnly
              ? 'View'
              : branchId
                ? 'Edit'
                : 'Add'
          }
        </span>

        <div className="user-meta">
          User: <b>APPADMIN</b>
          &nbsp;&nbsp; Party: <b>APPADMIN</b>
          &nbsp;&nbsp; Role: <b>APPADMIN</b>
        </div>
      </header>

      <div className="action-bar form-toolbar">
        <button
          type="button"
          aria-label="Back"
          onClick={requestCancel}
        >
          ↶
        </button>

        {!isReadOnly && (
          <button
            type="button"
            aria-label="Save"
            onClick={submit}
            disabled={branchMutation.isPending}
          >
            ✓
          </button>
        )}

        <button
          type="button"
          aria-label="Cancel"
          onClick={requestCancel}
        >
          <X size={13} />
        </button>

        <button
          className="toolbar-power"
          type="button"
          aria-label="Power"
        >
          <Power size={13} />
        </button>
      </div>

      <main className="organization-form-page">

        {/* Summary */}

        <section className="summary-box">
          <div className="section-title">
            <ClipboardList size={13} />
            Summary
          </div>

          <div className="summary-grid">
            <span>Code</span>
            <span>Name</span>
            <span>Status</span>
          </div>

          <div className="summary-values">
            <b>{form.code || '—'}</b>
            <b>{form.name || '—'}</b>
            <b>{form.status}</b>
          </div>

          <div className="summary-country">
            <span>Company</span>
            <b>{selectedCompany?.name || '—'}</b>
          </div>
        </section>

        <div className="details-tab">
          Main Details
        </div>

        <form
          className="organization-form reference-organization-form"
          onSubmit={submit}
        >
          <div className="reference-panels">

            {/* Branch Details */}

            <section className="reference-panel">
              <h2>
                <Building2 size={13} />
                Branch Details
              </h2>

              {field('Branch Code', 'code', true)}

              {field('Branch Name', 'name', true)}

              {lookupField(
                'Organization',
                selectedOrganization?.name,
                'organization'
              )}

              {lookupField(
                'Company',
                selectedCompany?.name,
                'company',
                true,
                !form.organizationId
              )}

              {field(
                'Branch Type ID',
                'branchTypeId',
                false,
                'number'
              )}

              <label className="status-field">
                <span>
                  Status <span className="required">*</span>
                </span>

                <select
                  disabled={isReadOnly}
                  value={form.status}
                  onChange={update('status')}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
            </section>

            {/* Manager Details */}

            <section className="reference-panel">
              <h2>
                <Phone size={13} />
                Manager Details
              </h2>

              {field('Manager Name', 'managerName')}

              {field(
                'Manager Email',
                'managerEmail',
                false,
                'email'
              )}

              {field(
                'Manager Phone',
                'managerPhone',
                false,
                'tel'
              )}

              {field(
                'Operating Hours',
                'operatingHours'
              )}
            </section>

            {/* Address Details */}

            <section className="reference-panel">
              <h2>
                <MapPin size={13} />
                Address Details
              </h2>

              {field('Address', 'address')}

              {lookupField(
                'Country',
                selectedCountry?.name,
                'country'
              )}

              {lookupField(
                'State/Province',
                selectedState?.name,
                'state',
                false,
                !form.countryId || !states.length
              )}

              {lookupField(
                'City',
                selectedCity?.name,
                'city',
                false,
                !form.stateId || !cities.length
              )}
            </section>

          </div>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          {organizationsQuery.error && (
            <div className="form-error">
              {organizationsQuery.error.message}
            </div>
          )}

          {companiesQuery.error && (
            <div className="form-error">
              {companiesQuery.error.message}
            </div>
          )}

          {locationError && (
            <div className="form-error">
              {locationError}
            </div>
          )}
        </form>

        {/* General lookup popup */}

        {lookup && (
          <div className="modal-backdrop">
            <section className="currency-modal location-modal">

              <header>
                {lookupTitle}

                <button
                  type="button"
                  aria-label={`Close ${lookupTitle} lookup`}
                  onClick={() => setLookup(null)}
                >
                  <X size={14} />
                </button>
              </header>

              <div className="currency-search location-search">
                <div className="currency-search-fields">

                  <label>
                    Code
                    <input
                      value={lookupCodeSearch}
                      onChange={(event) => {
                        setLookupCodeSearch(event.target.value);
                        setLookupPage(1);
                      }}
                    />
                  </label>

                  <label>
                    Name
                    <input
                      value={lookupNameSearch}
                      onChange={(event) => {
                        setLookupNameSearch(event.target.value);
                        setLookupPage(1);
                      }}
                    />
                  </label>

                  <label>
                    Status
                    <select
                      value={lookupStatus}
                      onChange={(event) => {
                        setLookupStatus(event.target.value);
                        setLookupPage(1);
                      }}
                    >
                      <option value="Select">Select</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </label>

                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>{lookupTitle} Name</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleLookupOptions.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => chooseLookupItem(item)}
                    >
                      <td>{item.code || '—'}</td>
                      <td>{item.name || '—'}</td>
                      <td>{item.status || '—'}</td>
                    </tr>
                  ))}

                  {!visibleLookupOptions.length && (
                    <tr>
                      <td className="empty" colSpan="3">
                        No matching {lookupTitle.toLowerCase()}s found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <footer>
                <em>♧ Click a row to select</em>

                <div className="currency-pager">

                  <button
                    type="button"
                    disabled={lookupPage === 1}
                    onClick={() => setLookupPage(1)}
                  >
                    |‹
                  </button>

                  <button
                    type="button"
                    disabled={lookupPage === 1}
                    onClick={() => setLookupPage((value) => value - 1)}
                  >
                    ‹
                  </button>

                  <b>{lookupPage}</b>

                  <span>/ {lookupTotalPages}</span>

                  <button
                    type="button"
                    disabled={lookupPage === lookupTotalPages}
                    onClick={() => setLookupPage((value) => value + 1)}
                  >
                    ›
                  </button>

                  <span>Lines per Page</span>

                  <select
                    aria-label={`${lookupTitle} lines per page`}
                    value={lookupPageSize}
                    onChange={(event) => {
                      setLookupPageSize(Number(event.target.value));
                      setLookupPage(1);
                    }}
                  >
                    <option value="5">5</option>
                    <option value="7">7</option>
                  </select>

                </div>
              </footer>

            </section>
          </div>
        )}

        {/* Confirmation / Error / Discard dialog */}

        {dialog && (
          <OrganizationDialog
            type={dialog.type}
            message={dialog.message}
            onCancel={() => setDialog(null)}
            onConfirm={confirmSave}
            onDiscard={discardChanges}
          />
        )}

      </main>
    </div>
  );
}

export default BranchForm;