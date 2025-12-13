// ======= DATA MODEL (LOCAL STORAGE DEMO) =======
const STORAGE_KEY = "callflow_crm_demo_v3";
const SIDEBAR_STATE_KEY = "crm_sidebar_state";

const defaultState = {
  users: [
    {
      id: "u_admin",
      name: "Admin User",
      contact: "admin@crm.demo",
      userId: "admin@crm",
      password: "admin123",
      role: "admin",
      lastActive: null,
    },
  ],
  clients: [],
  currentUser: null,
  updatedAt: new Date().toISOString(),
};

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(defaultState);
  try {
    return JSON.parse(raw);
  } catch (e) {
    return structuredClone(defaultState);
  }
}

function saveState() {
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateHeroStats();
  updateDashboardStats();
  document.getElementById("sidebarPresence").textContent =
    "Saved " + new Date().toLocaleTimeString();
}

let state = loadState();

// ======= SIDEBAR STATE MANAGEMENT =======
function saveSidebarState(isCollapsed) {
  localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify({collapsed: isCollapsed}));
}

function loadSidebarState() {
  const raw = localStorage.getItem(SIDEBAR_STATE_KEY);
  if (!raw) return false; // Default to expanded
  try {
    const data = JSON.parse(raw);
    return data.collapsed || false;
  } catch (e) {
    return false;
  }
}

// ======= HELPERS =======
function showToast(msg) {
  const toast = document.getElementById("toast");
  const msgEl = document.getElementById("toastMessage");
  msgEl.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

document.getElementById("toastClose").onclick = () => {
  document.getElementById("toast").classList.remove("show");
};

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return (
    d.toLocaleDateString() +
    " " +
    d.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})
  );
}

function generateId(prefix) {
  return prefix + "_" + Math.random().toString(36).slice(2, 10);
}

function getCurrentUser() {
  return state.currentUser
    ? state.users.find((u) => u.id === state.currentUser) || null
    : null;
}

function getEmployeeList() {
  return state.users.filter((u) => u.role === "employee");
}

function getClientsForUser(user) {
  if (!user) return [];
  if (user.role === "admin") return state.clients;
  return state.clients.filter((c) => c.assignedTo === user.id);
}

function computeStats() {
  const clients = state.clients;
  const totalCalls = clients.filter((c) => c.status).length;
  const converted = clients.filter((c) => c.status === "Converted").length;
  const followUps = clients.filter((c) => c.status === "Follow-up").length;
  const convRate =
    clients.length === 0
      ? 0
      : Math.round((converted / clients.length) * 100);
  const employees = getEmployeeList();
  return {
    totalCalls,
    converted,
    followUps,
    convRate,
    employeesCount: employees.length,
    clientsCount: clients.length,
  };
}

function computeEmployeeStats() {
  const employees = getEmployeeList();
  const stats = [];
  for (const emp of employees) {
    const empClients = state.clients.filter(
      (c) => c.assignedTo === emp.id
    );
    const calls = empClients.filter((c) => c.status).length;
    const converted = empClients.filter(
      (c) => c.status === "Converted"
    ).length;
    stats.push({
      id: emp.id,
      name: emp.name,
      assigned: empClients.length,
      calls,
      converted,
      lastActive: emp.lastActive,
    });
  }
  return stats;
}

// ======= LOGIN FLOW =======
const authView = document.getElementById("authView");
const appShell = document.getElementById("appShell");
const loginForm = document.getElementById("loginForm");
const adminTabBtn = document.getElementById("adminTabBtn");
const employeeTabBtn = document.getElementById("employeeTabBtn");
const loginError = document.getElementById("loginError");
const loginBtnText = document.getElementById("loginBtnText");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");

let loginRole = "admin";

function setLoginRole(role) {
  loginRole = role;
  if (role === "admin") {
    adminTabBtn.classList.add("active");
    employeeTabBtn.classList.remove("active");
    authTitle.textContent = "Welcome back, Admin";
    authSubtitle.textContent =
      "Sign in as administrator to manage employees, assign leads, and track performance.";
    loginBtnText.textContent = "Login as Admin";
  } else {
    adminTabBtn.classList.remove("active");
    employeeTabBtn.classList.add("active");
    authTitle.textContent = "Login as Employee";
    authSubtitle.textContent =
      "Use your employee ID and password created by the admin to access assigned clients.";
    loginBtnText.textContent = "Login as Employee";
  }
  loginError.style.display = "none";
}

adminTabBtn.addEventListener("click", () => setLoginRole("admin"));
employeeTabBtn.addEventListener("click", () => setLoginRole("employee"));

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const userId = document.getElementById("loginUserId").value.trim();
  const password = document.getElementById("loginPassword").value;

  let user = state.users.find(
    (u) => u.userId === userId && u.password === password
  );
  if (!user || user.role !== loginRole) {
    loginError.textContent =
      "Invalid credentials or role. Please check your user ID, password or role selection.";
    loginError.style.display = "block";
    return;
  }

  state.currentUser = user.id;
  user.lastActive = new Date().toISOString();
  saveState();

  initAppForUser();
  authView.style.display = "none";
  appShell.classList.add("show");
  showToast(`Logged in as ${user.name} (${user.role})`);
  loginForm.reset();
  loginError.style.display = "none";
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  state.currentUser = null;
  saveState();
  appShell.classList.remove("show");
  authView.style.display = "flex";
});

// ======= SIDEBAR TOGGLE FUNCTIONALITY =======
const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");
const menuIcon = document.getElementById("menuIcon");
const topbarTitle = document.getElementById("topbarTitle");

let isSidebarCollapsed = loadSidebarState();
let isMobile = window.innerWidth <= 900;

// Check screen size
function checkScreenSize() {
  isMobile = window.innerWidth <= 900;

  if (isMobile) {
    // On mobile, sidebar should start closed
    sidebar.classList.remove('collapsed');
    sidebar.classList.remove('open');
    menuIcon.className = 'fa-solid fa-bars';
  } else {
    // On desktop, restore saved state
    sidebar.classList.remove('open');
    if (isSidebarCollapsed) {
      sidebar.classList.add('collapsed');
      menuIcon.className = 'fa-solid fa-chevron-right';
    } else {
      sidebar.classList.remove('collapsed');
      menuIcon.className = 'fa-solid fa-bars';
    }
  }
}

// Toggle sidebar
function toggleSidebar() {
  if (isMobile) {
    // On mobile, just open/close
    sidebar.classList.toggle('open');
    menuIcon.className = sidebar.classList.contains('open')
      ? 'fa-solid fa-times'
      : 'fa-solid fa-bars';
  } else {
    // On desktop, toggle collapsed state
    isSidebarCollapsed = !isSidebarCollapsed;
    sidebar.classList.toggle('collapsed');

    if (isSidebarCollapsed) {
      menuIcon.className = 'fa-solid fa-chevron-right';
      showToast('Sidebar collapsed');
    } else {
      menuIcon.className = 'fa-solid fa-bars';
      showToast('Sidebar expanded');
    }

    saveSidebarState(isSidebarCollapsed);
  }
}

menuToggle.addEventListener('click', toggleSidebar);

// Close sidebar when clicking on a link (mobile only)
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    if (isMobile) {
      sidebar.classList.remove('open');
      menuIcon.className = 'fa-solid fa-bars';
    }
  });
});

// Handle window resize
window.addEventListener('resize', checkScreenSize);

// ======= APP INIT =======
function setActiveView(viewId, title) {
  document
    .querySelectorAll(".view")
    .forEach((v) => (v.style.display = "none"));
  document.getElementById("view-" + viewId).style.display = "block";
  document
    .querySelectorAll(".nav-link")
    .forEach((a) => a.classList.remove("active"));
  const link = document.querySelector(
    `.nav-link[data-view="${viewId}"]`
  );
  if (link) link.classList.add("active");
  topbarTitle.textContent = title;
}

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const view = link.getAttribute("data-view");
    const text = link.querySelector('span:not(.nav-pill)').textContent.trim();
    setActiveView(view, text);
    if (view === "clients") renderClientsTable();
    if (view === "employees") {
      renderEmployeesTable();
      refreshAssignEmployeeSelect();
    }
    if (view === "feedback") renderFeedbackTable();
  });
});

function initAppForUser() {
  const user = getCurrentUser();
  if (!user) return;

  document.getElementById("userNameTop").textContent = user.name;
  document.getElementById("userRoleTop").textContent =
    user.role === "admin" ? "Admin" : "Employee";
  document.getElementById("userAvatar").textContent =
    user.name.charAt(0).toUpperCase();
  document.getElementById("sidebarRoleBadge").innerHTML =
    '<i class="fa-solid fa-circle-user"></i>' +
    (user.role === "admin" ? " Admin" : " Employee");

  // Role-based UI
  document
    .querySelectorAll(".admin-only")
    .forEach(
      (el) => (el.style.display = user.role === "admin" ? "" : "none")
    );

  // Initialize sidebar state
  checkScreenSize();

  // Default view
  setActiveView("dashboard", "Overview");

  // Fill data-driven UI
  refreshAssignEmployeeSelect();
  refreshEmployeeFilters();
  renderEmployeesTable();
  renderClientsTable();
  renderDashboardTables();
  updateHeroStats();
  updateDashboardStats();
}

// On initial load, if user was logged in
if (getCurrentUser()) {
  authView.style.display = "none";
  appShell.classList.add("show");
  initAppForUser();
}

// ======= EMPLOYEES CRUD =======
const employeeForm = document.getElementById("employeeForm");
const employeesTableBody = document.getElementById("employeesTableBody");

employeeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("empName").value.trim();
  const contact = document.getElementById("empContact").value.trim();
  const userId = document.getElementById("empUserId").value.trim();
  const password = document.getElementById("empPassword").value;

  if (!name || !contact || !userId || !password) return;

  if (state.users.some((u) => u.userId === userId)) {
    showToast("User ID already exists. Use a different one.");
    return;
  }

  const id = generateId("u");
  state.users.push({
    id,
    name,
    contact,
    userId,
    password,
    role: "employee",
    lastActive: null,
  });
  saveState();
  employeeForm.reset();
  renderEmployeesTable();
  refreshAssignEmployeeSelect();
  refreshEmployeeFilters();
  showToast("Employee account created");
});

function deleteEmployee(id) {
  const hasClients = state.clients.some((c) => c.assignedTo === id);
  if (
    hasClients &&
    !confirm(
      "This employee has assigned clients. Delete anyway? Clients will remain unassigned."
    )
  ) {
    return;
  }

  state.users = state.users.filter((u) => u.id !== id);
  state.clients
    .filter((c) => c.assignedTo === id)
    .forEach((c) => (c.assignedTo = null));
  saveState();
  renderEmployeesTable();
  refreshAssignEmployeeSelect();
  refreshEmployeeFilters();
  showToast("Employee deleted");
}

function renderEmployeesTable() {
  const employees = getEmployeeList();
  const stats = computeEmployeeStats();
  employeesTableBody.innerHTML = "";
  for (const emp of employees) {
    const st = stats.find((s) => s.id === emp.id) || {
      assigned: 0,
      calls: 0,
      converted: 0,
      lastActive: null,
    };
    const tr = document.createElement("tr");
    tr.innerHTML = `
              <td>${emp.name}</td>
              <td>${emp.contact}</td>
              <td>${emp.userId}</td>
              <td>${st.assigned}</td>
              <td>${st.lastActive ? formatDateTime(st.lastActive) : "—"}</td>
              <td>
                <button class="btn-table" data-delete-emp="${emp.id}">
                  <i class="fa-solid fa-trash"></i>
                  Delete
                </button>
              </td>
            `;
    employeesTableBody.appendChild(tr);
  }

  employeesTableBody
    .querySelectorAll("[data-delete-emp]")
    .forEach((btn) => {
      btn.addEventListener("click", () =>
        deleteEmployee(btn.getAttribute("data-delete-emp"))
      );
    });

  document.getElementById("heroEmployees").textContent =
    employees.length.toString();
  document.getElementById("statEmployees").textContent =
    employees.length.toString();
}

document
  .getElementById("btnResetDemoEmployees")
  .addEventListener("click", () => {
    const demo = [
      {
        name: "Rahul Verma",
        contact: "rahul@example.com",
        userId: "rahul",
        password: "123456",
      },
      {
        name: "Priya Sharma",
        contact: "priya@example.com",
        userId: "priya",
        password: "123456",
      },
    ];
    for (const d of demo) {
      if (state.users.some((u) => u.userId === d.userId)) continue;
      state.users.push({
        id: generateId("u"),
        name: d.name,
        contact: d.contact,
        userId: d.userId,
        password: d.password,
        role: "employee",
        lastActive: null,
      });
    }
    saveState();
    renderEmployeesTable();
    refreshAssignEmployeeSelect();
    refreshEmployeeFilters();
    showToast("Demo employees added");
  });

function refreshAssignEmployeeSelect() {
  const select = document.getElementById("assignEmployeeSelect");
  const filterSelect = document.getElementById("clientEmployeeFilter");
  const feedbackEmpFilter =
    document.getElementById("feedbackEmployeeFilter");
  const employees = getEmployeeList();
  select.innerHTML =
    '<option value="">Select employee</option>' +
    employees
      .map(
        (e) => `<option value="${e.id}">${e.name}</option>`
      )
      .join("");
  if (filterSelect) {
    filterSelect.innerHTML =
      '<option value="">All employees</option>' +
      employees
        .map(
          (e) => `<option value="${e.id}">${e.name}</option>`
        )
        .join("");
  }
  if (feedbackEmpFilter) {
    feedbackEmpFilter.innerHTML =
      '<option value="">All employees</option>' +
      employees
        .map(
          (e) => `<option value="${e.id}">${e.name}</option>`
        )
        .join("");
  }
}

function refreshEmployeeFilters() {
  refreshAssignEmployeeSelect();
}

// ======= CLIENTS =======
const clientsTableBody = document.getElementById("clientsTableBody");
const dashboardClientsBody = document.getElementById(
  "dashboardClientsBody"
);
const employeeStatsBody = document.getElementById("employeeStatsBody");

function createClientRowElement(client, forDashboard = false) {
  const user = getCurrentUser();
  const assignedEmp = state.users.find(
    (u) => u.id === client.assignedTo
  );
  const assignedName = assignedEmp ? assignedEmp.name : "Unassigned";
  const statusClass =
    client.status === "Not Received"
      ? "status-not-received"
      : client.status === "Busy"
        ? "status-busy"
        : client.status === "Not Incoming"
          ? "status-not-incoming"
          : client.status === "Follow-up"
            ? "status-follow-up"
            : client.status === "Converted"
              ? "status-converted"
              : client.status === "Interested"
                ? "status-interested"
                : client.status === "Not Interested"
                  ? "status-not-interested"
                  : "";

  if (forDashboard) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
              <td>${client.name}</td>
              <td>${client.phone || client.email || "—"}</td>
              <td>${assignedName}</td>
              <td>
                <span class="status-badge ${statusClass}">
                  <span class="status-pill-live"></span>
                  ${client.status || "No status"}
                </span>
              </td>
              <td>${client.feedback ? client.feedback.slice(0, 50) + (client.feedback.length > 50 ? "…" : "") : "—"}</td>
            `;
    return tr;
  }

  const tr = document.createElement("tr");
  tr.innerHTML = `
            <td>
              <input type="checkbox" class="client-select" data-client-id="${client.id}" />
            </td>
            <td>${client.name}</td>
            <td>${client.phone || client.email || "—"}</td>
            <td>${assignedName}</td>
            <td>
              <select class="select-control client-status" data-client-id="${client.id}">
                <option value="">Select status</option>
                <option ${client.status === "Not Received" ? "selected" : ""
    }>Not Received</option>
                <option ${client.status === "Busy" ? "selected" : ""
    }>Busy</option>
                <option ${client.status === "Not Incoming" ? "selected" : ""
    }>Not Incoming</option>
                <option ${client.status === "Interested" ? "selected" : ""
    }>Interested</option>
                <option ${client.status === "Not Interested" ? "selected" : ""
    }>Not Interested</option>
                <option ${client.status === "Follow-up" ? "selected" : ""
    }>Follow-up</option>
                <option ${client.status === "Converted" ? "selected" : ""
    }>Converted</option>
              </select>
            </td>
            <td>
              <div style="display:flex;flex-wrap:wrap;gap:4px">
                <a href="tel:${client.phone || ""}" class="btn-table primary">
                  <i class="fa-solid fa-phone"></i>
                  Call
                </a>
                <a
                  href="https://wa.me/${client.phone || ""
    }?text=${encodeURIComponent(
      "Hello, we are reaching out regarding your enquiry."
    )}"
                  target="_blank"
                  class="btn-table whatsapp"
                >
                  <i class="fa-brands fa-whatsapp"></i>
                  WhatsApp
                </a>
              </div>
            </td>
            <td style="min-width:200px">
              <textarea
                class="textarea-control client-feedback"
                data-client-id="${client.id}"
                placeholder="Add feedback / call notes"
              >${client.feedback || ""}</textarea>
              <button
                class="btn-table success"
                type="button"
                data-save-client="${client.id}"
                style="margin-top:4px"
              >
                <i class="fa-solid fa-floppy-disk"></i>
                Save
              </button>
            </td>
            <td>${client.updatedAt ? formatDateTime(client.updatedAt) : "—"}</td>
          `;
  return tr;
}

function renderClientsTable() {
  const user = getCurrentUser();
  const statusFilter = document.getElementById("clientStatusFilter")
    .value;
  const employeeFilter = document.getElementById("clientEmployeeFilter")
    ? document.getElementById("clientEmployeeFilter").value
    : "";
  clientsTableBody.innerHTML = "";
  const clients = getClientsForUser(user);
  for (const c of clients) {
    if (statusFilter && c.status !== statusFilter) continue;
    if (employeeFilter && c.assignedTo !== employeeFilter) continue;
    const tr = createClientRowElement(c);
    clientsTableBody.appendChild(tr);
  }

  // Wire handlers
  clientsTableBody
    .querySelectorAll(".client-status")
    .forEach((sel) => {
      sel.addEventListener("change", () => {
        const id = sel.getAttribute("data-client-id");
        const client = state.clients.find((c) => c.id === id);
        client.status = sel.value || "";
        client.updatedAt = new Date().toISOString();
        const user = getCurrentUser();
        if (user) user.lastActive = new Date().toISOString();
        saveState();
        renderDashboardTables();
        renderFeedbackTable();
        showToast("Status updated");
      });
    });

  clientsTableBody
    .querySelectorAll("[data-save-client]")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-save-client");
        const client = state.clients.find((c) => c.id === id);
        const feedbackEl = clientsTableBody.querySelector(
          `.client-feedback[data-client-id="${id}"]`
        );
        client.feedback = feedbackEl.value.trim();
        client.updatedAt = new Date().toISOString();
        const user = getCurrentUser();
        if (user) user.lastActive = new Date().toISOString();
        saveState();
        renderDashboardTables();
        renderFeedbackTable();
        showToast("Feedback saved");
      });
    });
}

function renderDashboardTables() {
  // Employee stats
  const stats = computeEmployeeStats();
  employeeStatsBody.innerHTML = "";
  for (const st of stats) {
    const emp = state.users.find((u) => u.id === st.id);
    const tr = document.createElement("tr");
    tr.innerHTML = `
              <td>${emp ? emp.name : "Unknown"}</td>
              <td>${st.assigned}</td>
              <td>${st.calls}</td>
              <td>${st.converted}</td>
              <td>${st.lastActive ? formatDateTime(st.lastActive) : "—"}</td>
            `;
    employeeStatsBody.appendChild(tr);
  }

  // Clients status list
  dashboardClientsBody.innerHTML = "";
  const filterBtn = document.querySelector(".pill-filter.active");
  const status = filterBtn ? filterBtn.getAttribute("data-status-filter") : "all";

  for (const c of state.clients) {
    if (status !== "all") {
      // Here we map filter labels; "Not Interested" filter is exact
      if (c.status !== status) continue;
    }
    const tr = createClientRowElement(c, true);
    dashboardClientsBody.appendChild(tr);
  }
}

// Select all checkbox
document
  .getElementById("selectAllClients")
  .addEventListener("change", (e) => {
    const checked = e.target.checked;
    clientsTableBody
      .querySelectorAll(".client-select")
      .forEach((cb) => (cb.checked = checked));
  });

document
  .getElementById("btnAssignSelected")
  .addEventListener("click", () => {
    const empId =
      document.getElementById("assignEmployeeSelect").value;
    if (!empId) {
      showToast("Select an employee first");
      return;
    }
    const selected = Array.from(
      clientsTableBody.querySelectorAll(".client-select:checked")
    );
    if (!selected.length) {
      showToast("Select at least one client row");
      return;
    }
    selected.forEach((cb) => {
      const id = cb.getAttribute("data-client-id");
      const client = state.clients.find((c) => c.id === id);
      if (client) client.assignedTo = empId;
    });
    saveState();
    renderClientsTable();
    renderDashboardTables();
    renderEmployeesTable();
    showToast("Clients assigned to employee");
  });

document
  .getElementById("clientStatusFilter")
  .addEventListener("change", renderClientsTable);
const empFilterEl = document.getElementById("clientEmployeeFilter");
if (empFilterEl) {
  empFilterEl.addEventListener("change", renderClientsTable);
}

// Dashboard pill filters
document.querySelectorAll(".pill-filter").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".pill-filter")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderDashboardTables();
  });
});

// ======= FEEDBACK VIEW =======
const feedbackTableBody = document.getElementById("feedbackTableBody");

function renderFeedbackTable() {
  const empFilter = document.getElementById("feedbackEmployeeFilter")
    ? document.getElementById("feedbackEmployeeFilter").value
    : "";
  const statusFilter = document.getElementById(
    "feedbackStatusFilter"
  ).value;
  const user = getCurrentUser();
  const clients = getClientsForUser(user);
  feedbackTableBody.innerHTML = "";
  for (const c of clients) {
    if (!c.feedback && !c.status) continue;
    if (empFilter && c.assignedTo !== empFilter) continue;
    if (statusFilter && c.status !== statusFilter) continue;
    const emp = state.users.find((u) => u.id === c.assignedTo);
    const tr = document.createElement("tr");
    tr.innerHTML = `
              <td>${c.name}</td>
              <td>${emp ? emp.name : "—"}</td>
              <td>${c.status || "—"}</td>
              <td>${c.feedback || "—"}</td>
              <td>${c.updatedAt ? formatDateTime(c.updatedAt) : "—"}</td>
            `;
    feedbackTableBody.appendChild(tr);
  }
}

const feedbackEmpFilter = document.getElementById(
  "feedbackEmployeeFilter"
);
if (feedbackEmpFilter) {
  feedbackEmpFilter.addEventListener("change", renderFeedbackTable);
}
document
  .getElementById("feedbackStatusFilter")
  .addEventListener("change", renderFeedbackTable);

// ======= IMPORT (CSV only in demo) =======
document
  .getElementById("btnParseFile")
  .addEventListener("click", () => {
    const input = document.getElementById("clientFileInput");
    const file = input.files && input.files[0];
    if (!file) {
      showToast("Select a CSV file first");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length <= 0) {
        showToast("File is empty");
        return;
      }
      // Simple CSV: Name,Phone,Email
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",");
        if (!parts[0]) continue;
        state.clients.push({
          id: generateId("c"),
          name: parts[0].trim(),
          phone: (parts[1] || "").trim(),
          email: (parts[2] || "").trim(),
          assignedTo: null,
          status: "",
          feedback: "",
          updatedAt: null,
        });
      }
      saveState();
      renderClientsTable();
      renderDashboardTables();
      showToast("Clients imported from CSV");
      document.getElementById("heroClients").textContent =
        state.clients.length.toString();
    };
    reader.readAsText(file);
  });

// ======= EXPORT CSV =======
function downloadCSV(filename, rows) {
  const processRow = (row) =>
    row
      .map((value) => {
        const inner = value === null || value === undefined ? "" : value;
        const result =
          typeof inner === "string" ? inner.replace(/"/g, '""') : inner;
        return `"${result}"`;
      })
      .join(",");
  const csvContent = rows.map(processRow).join("\n");
  const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document
  .getElementById("btnExportClients")
  .addEventListener("click", () => {
    const rows = [
      [
        "Client Name",
        "Phone",
        "Email",
        "Assigned Employee",
        "Status",
        "Feedback",
        "Updated At",
      ],
    ];
    for (const c of state.clients) {
      const emp = state.users.find((u) => u.id === c.assignedTo);
      rows.push([
        c.name,
        c.phone || "",
        c.email || "",
        emp ? emp.name : "",
        c.status || "",
        c.feedback || "",
        c.updatedAt ? formatDateTime(c.updatedAt) : "",
      ]);
    }
    downloadCSV("clients_export.csv", rows);
    showToast("Clients CSV exported");
  });

document
  .getElementById("btnExportPerformance")
  .addEventListener("click", () => {
    const rows = [
      [
        "Employee",
        "Assigned Clients",
        "Calls Logged",
        "Converted",
        "Last Active",
      ],
    ];
    const stats = computeEmployeeStats();
    for (const st of stats) {
      rows.push([
        st.name,
        st.assigned,
        st.calls,
        st.converted,
        st.lastActive ? formatDateTime(st.lastActive) : "",
      ]);
    }
    downloadCSV("employee_performance.csv", rows);
    showToast("Performance CSV exported");
  });

// ======= SEARCH BAR & GLOBAL FILTER =======
const searchInput = document.getElementById("searchInput");
const clearSearch = document.getElementById("clearSearch");

function applySearchFilter() {
  const q = searchInput.value.trim().toLowerCase();
  const user = getCurrentUser();
  if (!user) return;
  const clients = getClientsForUser(user);

  if (!q) {
    renderClientsTable();
    clearSearch.style.display = "none";
    return;
  }
  clearSearch.style.display = "inline-flex";
  clientsTableBody.innerHTML = "";
  for (const c of clients) {
    const hay = [
      c.name,
      c.phone,
      c.email,
      c.status,
      (c.feedback || "").slice(0, 80),
    ]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) continue;
    clientsTableBody.appendChild(createClientRowElement(c));
  }
}

searchInput.addEventListener("input", applySearchFilter);
clearSearch.addEventListener("click", () => {
  searchInput.value = "";
  clearSearch.style.display = "none";
  renderClientsTable();
});

// ======= STATS & HERO =======
const statTotalCalls = document.getElementById("statTotalCalls");
const statConverted = document.getElementById("statConverted");
const statFollowUps = document.getElementById("statFollowUps");
const statConvRate = document.getElementById("statConvRate");

function updateDashboardStats() {
  const s = computeStats();
  statTotalCalls.textContent = s.totalCalls.toString();
  statConverted.textContent = s.converted.toString();
  statFollowUps.textContent = s.followUps.toString();
  statConvRate.textContent = s.convRate + "%";
  document.getElementById("heroCallsValue").textContent =
    s.totalCalls.toString();
  document.getElementById("heroConvRate").textContent =
    s.convRate + "%";
  document.getElementById("heroEmployees").textContent =
    s.employeesCount.toString();
  document.getElementById("heroClients").textContent =
    s.clientsCount.toString();
}

function updateHeroStats() {
  updateDashboardStats();
}

// ======= TIME BADGE =======
function updateSidebarTime() {
  const el = document.getElementById("sidebarTime");
  el.textContent = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
updateSidebarTime();
setInterval(updateSidebarTime, 60 * 1000);
