const $ = (s) => document.querySelector(s);

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json().catch(() => ({ error: "Unexpected server response." }));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function msg(el, s, bad = false) {
  if (!el) return;
  el.textContent = s;
  el.classList.toggle("error", bad);
}

async function showDashboard() {
  const loginPanel = $("#loginPanel");
  const dashboard = $("#dashboard");
  if (!loginPanel || !dashboard) return;

  try {
    await api("/api/admin/me");
    loginPanel.hidden = true;
    dashboard.hidden = false;
    await loadApplications();
  } catch {
    loginPanel.hidden = false;
    dashboard.hidden = true;
  }
}

const loginForm = $("#loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = Object.fromEntries(new FormData(form).entries());
    try {
      await api("/api/admin/login", { method: "POST", body: JSON.stringify(formData) });
      msg($("#loginResult"), "Signed in.");
      await showDashboard();
    } catch (err) {
      msg($("#loginResult"), err.message, true);
    }
  });
}

const logoutButton = $("#logout");
if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    try {
      await api("/api/admin/logout", { method: "POST", body: "{}" });
    } finally {
      location.reload();
    }
  });
}

const jobForm = $("#jobForm");
if (jobForm) {
  jobForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = Object.fromEntries(new FormData(form).entries());
    try {
      await api("/api/admin/jobs", { method: "POST", body: JSON.stringify(formData) });
      msg($("#jobResult"), "Vacancy published.");
      form.reset();
    } catch (err) {
      msg($("#jobResult"), err.message, true);
    }
  });
}

async function loadApplications() {
  const box = $("#applications");
  if (!box) return;

  box.textContent = "Loading…";
  try {
    const rows = await api("/api/admin/applications");
    const data = Array.isArray(rows) ? rows : [];

    if (!data.length) {
      box.textContent = "No applications have been received.";
      return;
    }

    const table = document.createElement("table");
    const head = document.createElement("tr");
    ["Reference / candidate", "Contact & profile", "Vacancy", "Status", "Submitted"].forEach((t) => {
      const th = document.createElement("th");
      th.textContent = t;
      head.append(th);
    });

    const thead = document.createElement("thead");
    thead.append(head);
    table.append(thead);

    const body = document.createElement("tbody");
    data.forEach((a) => {
      const tr = document.createElement("tr");

      const c1 = document.createElement("td");
      c1.textContent = `${a.reference}\n${a.full_name}`;

      const c2 = document.createElement("td");
      c2.textContent = `${a.email}\n${a.country}\n${a.occupation}\nExperience: ${a.experience}\nEducation: ${a.education}\nCV: ${a.cv_status}\n${a.message || ""}`;

      const c3 = document.createElement("td");
      c3.textContent = a.job_title || "General profile";

      const c4 = document.createElement("td");
      const sel = document.createElement("select");
      ["Received", "Under review", "Shortlisted", "Interview", "Offer made", "Not selected", "Closed"].forEach((s) => {
        const o = document.createElement("option");
        o.value = s;
        o.textContent = s;
        sel.append(o);
      });
      sel.value = a.status;
      sel.addEventListener("change", async () => {
        try {
          await api(`/api/admin/applications/${a.id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: sel.value })
          });
        } catch (err) {
          alert(err.message);
          sel.value = a.status;
        }
      });
      c4.append(sel);

      const c5 = document.createElement("td");
      c5.textContent = new Date(a.created_at).toLocaleString();

      [c1, c2, c3, c4, c5].forEach((cell) => tr.append(cell));
      body.append(tr);
    });

    table.append(body);
    box.innerHTML = "";
    box.append(table);
  } catch (err) {
    box.textContent = err.message;
  }
}

const loadApplicationsButton = $("#loadApplications");
if (loadApplicationsButton) {
  loadApplicationsButton.addEventListener("click", loadApplications);
}

showDashboard();
