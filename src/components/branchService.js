
const emptySearch = {
  code: '',
  name: '',
  status: 'Select'
};

const emptyBranch = {
  code: '',
  name: '',
  organizationId: '',
  companyId: '',
  branchTypeId: '',
  managerName: '',
  managerEmail: '',
  managerPhone: '',
  address: '',
  countryId: '',
  stateId: '',
  cityId: '',
  operatingHours: '',
  status: 'Active'
};

// COMMON API RESPONSE HANDLER

async function readApiResponse(response, fallbackMessage) {
  const body = await response.text();
  let result = null;

  if (body) {
    try {
      result = JSON.parse(body);
    } catch {
      throw new Error(`${fallbackMessage} (HTTP ${response.status})`);
    }
  }

  if (!response.ok) {
    throw new Error(
      result?.message || `${fallbackMessage} (HTTP ${response.status})`
    );
  }

  if (result === null) {
    throw new Error(
      `${fallbackMessage}: the API returned an empty response.`
    );
  }

  return result;
}

// BRANCH LIST

async function getBranches({ queryKey }) {
  const [, filters, page, linesPerPage] = queryKey;

  const params = new URLSearchParams({
    code: filters.code,
    name: filters.name,
    status: filters.status,
    page: String(page),
    linesPerPage: String(linesPerPage)
  });

  const response = await fetch(`/api/branches?${params}`);

  return readApiResponse(response, 'Unable to load branches');
}

// GET SINGLE BRANCH

async function getBranch(id) {
  const response = await fetch(`/api/branches/${id}`);

  return readApiResponse(response, 'Unable to load branch');
}

// CREATE BRANCH

async function createBranch(branch) {
  const response = await fetch('/api/branches', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(branch)
  });

  return readApiResponse(response, 'Unable to create branch');
}

// UPDATE BRANCH

async function saveBranch(id, branch) {
  const response = await fetch(`/api/branches/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(branch)
  });

  return readApiResponse(response, 'Unable to update branch');
}

// DELETE BRANCH

async function deleteBranch(id) {
  const response = await fetch(`/api/branches/${id}`, {
    method: 'DELETE'
  });

  return readApiResponse(response, 'Unable to delete branch');
}

// GET ORGANIZATIONS

async function getOrganizations() {
  const params = new URLSearchParams({
    page: '1',
    linesPerPage: '10000'
  });

  const response = await fetch(`/api/organizations?${params}`);
  const result = await readApiResponse(
    response,
    'Unable to load organizations'
  );

  return result.rows || [];
}

// GET COMPANIES

async function getCompanies(organizationId = '') {
  const params = new URLSearchParams();

  if (organizationId) {
    params.set('organizationId', organizationId);
  }

  const response = await fetch(`/api/companies?${params}`);

  return readApiResponse(response, 'Unable to load companies');
}

// GET COUNTRIES FROM DATABASE MASTER TABLE

async function getCountries() {
  const response = await fetch('/api/countries');

  return readApiResponse(response, 'Unable to load countries');
}

// GET STATES BASED ON COUNTRY DATABASE ID

async function getStates(countryId) {
  if (!countryId) return [];

  const params = new URLSearchParams({
    countryId: String(countryId)
  });

  const response = await fetch(`/api/states?${params}`);

  return readApiResponse(response, 'Unable to load states');
}

// GET CITIES BASED ON STATE DATABASE ID

async function getCities(stateId) {
  if (!stateId) return [];

  const params = new URLSearchParams({
    stateId: String(stateId)
  });

  const response = await fetch(`/api/cities?${params}`);

  return readApiResponse(response, 'Unable to load cities');
}

export {
  emptySearch,
  emptyBranch,
  readApiResponse,
  getBranches,
  getBranch,
  createBranch,
  saveBranch,
  deleteBranch,
  getOrganizations,
  getCompanies,
  getCountries,
  getStates,
  getCities
};
