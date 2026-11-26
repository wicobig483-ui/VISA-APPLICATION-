
const $ = (s) => document.querySelector(s);

// CURRENT EDITING VACANCY
let editingJobId = null;

// API HELPER
async function api(url, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (
    !(options.body instanceof FormData) &&
    options.body !== undefined
  ) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({
    error: "Unexpected server response."
  }));

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

// MESSAGES
function msg(el, message, bad = false) {
  if (!el) return;

  el.textContent = message;
  el.classList.toggle("error", bad);
}

// IMAGE PREVIEW
function previewImage(input, preview, resultElement) {
  if (!input || !preview) return;

  let previousUrl = null;

  input.addEventListener("change", () => {
    if (previousUrl) {
      URL.revokeObjectURL(previousUrl);
      previousUrl = null;
    }

    const file = input.files[0];

    if (!file) {
      preview.hidden = true;
      preview.removeAttribute("src");
      return;
    }

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowed.includes(file.type)) {
      input.value = "";
      preview.hidden = true;

      msg(
        resultElement,
        "Select a JPG, PNG or WEBP image.",
        true
      );

      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      input.value = "";
      preview.hidden = true;

      msg(
        resultElement,
        "Image must be 5MB or smaller.",
        true
      );

      return;
    }

    previousUrl = URL.createObjectURL(file);
    preview.src = previousUrl;
    preview.hidden = false;

    msg(resultElement, "");
  });
}

previewImage(
  $("#jobImage"),
  $("#jobPreview"),
  $("#jobResult")
);

previewImage(
  $("#galleryImage"),
  $("#galleryPreview"),
  $("#galleryResult")
);

// VIDEO PREVIEW
const jobVideoInput = $("#jobVideo");
const jobVideoPreview = $("#jobVideoPreview");

if (jobVideoInput && jobVideoPreview) {
  let previousVideoUrl = null;

  jobVideoInput.addEventListener("change", () => {
    if (previousVideoUrl) {
      URL.revokeObjectURL(previousVideoUrl);
      previousVideoUrl = null;
    }

    jobVideoPreview.pause();
    jobVideoPreview.removeAttribute("src");
    jobVideoPreview.load();
    jobVideoPreview.hidden = true;

    const file = jobVideoInput.files[0];

    if (!file) return;

    const allowedVideoTypes = [
      "video/mp4",
      "video/quicktime",
      "video/webm"
    ];

    if (!allowedVideoTypes.includes(file.type)) {
      jobVideoInput.value = "";

      msg(
        $("#videoResult"),
        "Select an MP4, MOV or WEBM video.",
        true
      );

      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      jobVideoInput.value = "";

      msg(
        $("#videoResult"),
        "Video must be 100MB or smaller.",
        true
      );

      return;
    }

    previousVideoUrl = URL.createObjectURL(file);

    jobVideoPreview.src = previousVideoUrl;
    jobVideoPreview.hidden = false;

    msg(
      $("#videoResult"),
      "Video selected successfully."
    );
  });
}

// UPLOAD IMAGE
async function uploadImage(file) {
  if (!file) return null;

  const formData = new FormData();
  formData.append("image", file);

  const result = await api("/api/admin/uploads", {
    method: "POST",
    body: formData
  });

  return result.image;
}

// UPLOAD VIDEO
async function uploadVideo(file) {
  if (!file) return null;

  const formData = new FormData();
  formData.append("video", file);

  const result = await api("/api/admin/video-uploads", {
    method: "POST",
    body: formData
  });

  return result.video;
}

// CLEAR MEDIA PREVIEWS
function clearJobPreviews() {
  const imagePreview = $("#jobPreview");

  if (imagePreview) {
    imagePreview.hidden = true;
    imagePreview.removeAttribute("src");
  }

  if (jobVideoPreview) {
    jobVideoPreview.pause();
    jobVideoPreview.removeAttribute("src");
    jobVideoPreview.load();
    jobVideoPreview.hidden = true;
  }

  if (jobVideoInput) {
    jobVideoInput.value = "";
  }

  if ($("#jobImage")) {
    $("#jobImage").value = "";
  }
}

// RESET VACANCY FORM
function resetJobEditor() {
  editingJobId = null;

  const form = $("#jobForm");

  if (form) {
    form.reset();
    form.elements.salaryConfirmed.required = true;
  }

  clearJobPreviews();

  if ($("#jobFormTitle")) {
    $("#jobFormTitle").textContent = "Publish a vacancy";
  }

  if ($("#jobSubmit")) {
    $("#jobSubmit").textContent = "Publish vacancy";
  }

  if ($("#cancelJobEdit")) {
    $("#cancelJobEdit").hidden = true;
  }

  msg($("#jobResult"), "");
  msg($("#videoResult"), "");
}

// LOGIN AND DASHBOARD
async function showDashboard() {
  const loginPanel = $("#loginPanel");
  const dashboard = $("#dashboard");

  if (!loginPanel || !dashboard) return;

  try {
    await api("/api/admin/me");

    loginPanel.hidden = true;
    dashboard.hidden = false;

    await Promise.all([
      loadApplications(),
      loadGallery(),
      loadJobs(),
      loadInvoices()
    ]);

  } catch {
    loginPanel.hidden = false;
    dashboard.hidden = true;
  }
}

// ADMIN LOGIN
const loginForm = $("#loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = Object.fromEntries(
      new FormData(e.currentTarget).entries()
    );

    try {
      await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify(formData)
      });

      msg($("#loginResult"), "Signed in.");

      await showDashboard();

    } catch (err) {
      msg($("#loginResult"), err.message, true);
    }
  });
}

// LOGOUT
const logoutButton = $("#logout");

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    try {
      await api("/api/admin/logout", {
        method: "POST",
        body: "{}"
      });

    } catch (err) {
      alert(err.message);

    } finally {
      location.reload();
    }
  });
}

// LOAD ALL PUBLISHED AND HIDDEN VACANCIES
async function loadJobs() {
  const box = $("#jobsList");

  if (!box) return;

  box.textContent = "Loading vacancies...";

  try {
    const rows = await api("/api/admin/jobs");

    if (!Array.isArray(rows) || !rows.length) {
      box.textContent = "No vacancies have been published yet.";
      return;
    }

    const list = document.createElement("div");

    list.style.display = "grid";
    list.style.gridTemplateColumns =
      "repeat(auto-fit, minmax(260px, 1fr))";
    list.style.gap = "16px";

    rows.forEach((job) => {
      const card = document.createElement("article");

      card.className = "panel";

      // JOB PHOTO
      if (job.image_url) {
        const image = document.createElement("img");

        image.src = job.image_url;
        image.alt = job.title || "Vacancy photo";
        image.loading = "lazy";

        image.style.width = "100%";
        image.style.maxHeight = "180px";
        image.style.objectFit = "cover";
        image.style.borderRadius = "8px";

        card.append(image);
      }

      // JOB TITLE
      const title = document.createElement("h3");
      title.textContent = job.title;

      // LOCATION
      const locationText = document.createElement("p");
      locationText.textContent =
        "Location: " + (job.location || "Not provided");

      // EMPLOYMENT TYPE
      const type = document.createElement("p");
      type.textContent =
        "Employment: " +
        (job.employment_type || "Not specified");

      // EMPLOYER-CONFIRMED SALARY AND IMMIGRATION SUPPORT
      const salary = document.createElement("p");
      salary.textContent = job.salary_min != null
        ? "Salary: CAD " + Number(job.salary_min).toLocaleString("en-CA") +
          (job.salary_max != null ? "–" + Number(job.salary_max).toLocaleString("en-CA") : "+") +
          " per " + (job.salary_period || "period not specified") +
          (job.salary_confirmed ? " (employer confirmed)" : " (not confirmed)")
        : "Salary: Not provided";
      const support = document.createElement("p");
      support.textContent = "LMIA: " + (job.lmia_status || "Not verified") +
        " | Work permit: " + (job.work_permit_support || "Not verified");

      // STATUS
      const status = document.createElement("p");

      status.textContent = job.active
        ? "Status: Published"
        : "Status: Hidden";

      // MEDIA STATUS
      const media = document.createElement("p");

      media.textContent =
        "Photo: " + (job.image_url ? "Available" : "None") +
        " | Video: " + (job.video_url ? "Available" : "None");

      // VIDEO LINK
      if (job.video_url) {
        const videoLink = document.createElement("a");

        videoLink.href = job.video_url;
        videoLink.target = "_blank";
        videoLink.rel = "noopener noreferrer";
        videoLink.textContent = "View job video";

        videoLink.style.display = "block";
        videoLink.style.marginBottom = "12px";

        card.append(videoLink);
      }

      // EDIT BUTTON
      const editButton = document.createElement("button");

      editButton.type = "button";
      editButton.className = "btn";
      editButton.textContent = "Edit vacancy";

      editButton.addEventListener("click", () => {
        editJob(job);
      });

      // DELETE BUTTON
      const deleteButton = document.createElement("button");

      deleteButton.type = "button";
      deleteButton.className = "btn secondary";
      deleteButton.textContent = "Delete vacancy";
      deleteButton.style.marginTop = "8px";

      deleteButton.addEventListener("click", async () => {
        const confirmed = window.confirm(
          'Delete "' + (job.title || "this vacancy") + '" permanently? This cannot be undone.'
        );

        if (!confirmed) return;

        deleteButton.disabled = true;

        try {
          await api(`/api/admin/jobs/${job.id}`, {
            method: "DELETE"
          });

          if (editingJobId === job.id) {
            resetJobEditor();
          }

          msg($("#jobResult"), "Vacancy deleted successfully.");
          await loadJobs();

        } catch (err) {
          alert(err.message);
          deleteButton.disabled = false;
        }
      });

      // SHOW/HIDE BUTTON
      const toggleButton = document.createElement("button");

      toggleButton.type = "button";
      toggleButton.className = "btn secondary";

      toggleButton.textContent = job.active
        ? "Hide vacancy"
        : "Publish vacancy";

      toggleButton.style.marginTop = "8px";

      toggleButton.addEventListener("click", async () => {
        toggleButton.disabled = true;

        try {
          const result = await api(`/api/admin/jobs/${job.id}/status`, {
            method: "PATCH",
            body: JSON.stringify({
              active: !job.active
            })
          });

          msg($("#jobResult"), result.message || "Vacancy status updated.");
          await loadJobs();

        } catch (err) {
          alert(err.message);
          toggleButton.disabled = false;
        }
      });

      card.append(
        title,
        locationText,
        type,
        salary,
        support,
        status,
        media,
        editButton,
        toggleButton,
        deleteButton
      );

      list.append(card);
    });

    box.replaceChildren(list);

  } catch (err) {
    box.textContent = err.message;
  }
}

// EDIT EXISTING VACANCY
function editJob(job) {
  const form = $("#jobForm");

  if (!form) return;

  editingJobId = job.id;

  form.elements.title.value = job.title || "";
  form.elements.location.value = job.location || "";
  form.elements.employmentType.value =
    job.employment_type || "Full-time";

  form.elements.description.value =
    job.description || "";

  form.elements.requirements.value =
    job.requirements || "";
  form.elements.salaryMin.value = job.salary_min ?? "";
  form.elements.salaryMax.value = job.salary_max ?? "";
  form.elements.salaryPeriod.value = job.salary_period || "";
  form.elements.salaryConfirmed.checked = job.salary_confirmed === true;
  form.elements.salaryConfirmed.required = true;
  form.elements.lmiaStatus.value = job.lmia_status || "Not verified";
  form.elements.workPermitSupport.value = job.work_permit_support || "Not verified";

  // SHOW EXISTING PHOTO
  if (job.image_url && $("#jobPreview")) {
    $("#jobPreview").src = job.image_url;
    $("#jobPreview").hidden = false;
  } else if ($("#jobPreview")) {
    $("#jobPreview").hidden = true;
    $("#jobPreview").removeAttribute("src");
  }

  // SHOW EXISTING VIDEO
  if (job.video_url && jobVideoPreview) {
    jobVideoPreview.src = job.video_url;
    jobVideoPreview.hidden = false;
    jobVideoPreview.load();
  } else if (jobVideoPreview) {
    jobVideoPreview.pause();
    jobVideoPreview.removeAttribute("src");
    jobVideoPreview.load();
    jobVideoPreview.hidden = true;
  }

  if ($("#jobFormTitle")) {
    $("#jobFormTitle").textContent =
      "Edit vacancy #" + job.id;
  }

  if ($("#jobSubmit")) {
    $("#jobSubmit").textContent = "Save changes";
  }

  if ($("#cancelJobEdit")) {
    $("#cancelJobEdit").hidden = false;
  }

  msg(
    $("#jobResult"),
    "Editing vacancy. Select a new photo or video only if you want to replace the existing one."
  );

  msg($("#videoResult"), "");

  form.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// CANCEL EDITING
const cancelEditButton = $("#cancelJobEdit");

if (cancelEditButton) {
  cancelEditButton.addEventListener("click", () => {
    resetJobEditor();
  });
}

// PUBLISH OR UPDATE VACANCY
const jobForm = $("#jobForm");

if (jobForm) {
  jobForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const button = $("#jobSubmit") ||
      jobForm.querySelector('[type="submit"]');

    const imageFile = $("#jobImage")?.files[0] || null;
    const videoFile = $("#jobVideo")?.files[0] || null;

    const formData = Object.fromEntries(
      new FormData(jobForm).entries()
    );

    button.disabled = true;

    try {
      let image = null;
      let video = null;

      // UPLOAD NEW PHOTO
      if (imageFile) {
        msg($("#jobResult"), "Uploading vacancy photo...");

        image = await uploadImage(imageFile);
      }

      // UPLOAD NEW VIDEO
      if (videoFile) {
        msg(
          $("#videoResult"),
          "Uploading job video. Please wait..."
        );

        video = await uploadVideo(videoFile);

        msg(
          $("#videoResult"),
          "Video uploaded successfully."
        );
      }

      // PREPARE VACANCY DATA
      const payload = {
        title: formData.title,
        location: formData.location,
        employmentType: formData.employmentType,
        description: formData.description,
        requirements: formData.requirements,
        salaryMin: formData.salaryMin,
        salaryMax: formData.salaryMax,
        salaryPeriod: formData.salaryPeriod,
        salaryConfirmed: jobForm.elements.salaryConfirmed.checked,
        lmiaStatus: formData.lmiaStatus || "Not verified",
        workPermitSupport: formData.workPermitSupport || "Not verified"
      };

      // ONLY SEND MEDIA FIELDS WHEN A NEW FILE IS SELECTED
      // This preserves existing media during editing.
      if (image) {
        payload.imageUrl = image.url;
        payload.imagePublicId = image.publicId;
      }

      if (video) {
        payload.videoUrl = video.url;
        payload.videoPublicId = video.publicId;
      }

      if (editingJobId !== null) {
        // UPDATE EXISTING VACANCY
        msg($("#jobResult"), "Saving vacancy changes...");

        await api(`/api/admin/jobs/${editingJobId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });

        msg(
          $("#jobResult"),
          "Vacancy updated successfully!"
        );

      } else {
        // PUBLISH NEW VACANCY
        msg($("#jobResult"), "Publishing vacancy...");

        // New vacancies need media fields even when no file is selected.
        if (!image) {
          payload.imageUrl = null;
          payload.imagePublicId = null;
        }

        if (!video) {
          payload.videoUrl = null;
          payload.videoPublicId = null;
        }

        await api("/api/admin/jobs", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        msg(
          $("#jobResult"),
          "Vacancy published successfully!"
        );
      }

      msg($("#videoResult"), "");

      resetJobEditor();

      await loadJobs();

    } catch (err) {
      msg(
        $("#jobResult"),
        err.message,
        true
      );

    } finally {
      button.disabled = false;
    }
  });
}

// REFRESH VACANCIES
const refreshJobsButton = $("#refreshJobs");

if (refreshJobsButton) {
  refreshJobsButton.addEventListener(
    "click",
    loadJobs
  );
}

// UPLOAD HOMEPAGE GALLERY PHOTO
const galleryForm = $("#galleryForm");

if (galleryForm) {
  galleryForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const button = galleryForm.querySelector('[type="submit"]');
    const file = $("#galleryImage")?.files[0];

    if (!file) {
      msg(
        $("#galleryResult"),
        "Please select a photo.",
        true
      );

      return;
    }

    const fields = Object.fromEntries(
      new FormData(galleryForm).entries()
    );

    button.disabled = true;

    msg(
      $("#galleryResult"),
      "Uploading gallery photo..."
    );

    try {
      const image = await uploadImage(file);

      await api("/api/admin/gallery", {
        method: "POST",
        body: JSON.stringify({
          title: fields.title,
          description: fields.description,
          imageUrl: image.url,
          imagePublicId: image.publicId
        })
      });

      msg(
        $("#galleryResult"),
        "Gallery photo published successfully!"
      );

      galleryForm.reset();

      if ($("#galleryPreview")) {
        $("#galleryPreview").hidden = true;
        $("#galleryPreview").removeAttribute("src");
      }

      await loadGallery();

    } catch (err) {
      msg(
        $("#galleryResult"),
        err.message,
        true
      );

    } finally {
      button.disabled = false;
    }
  });
}

// LOAD GALLERY PHOTOS
async function loadGallery() {
  const box = $("#galleryList");

  if (!box) return;

  box.textContent = "Loading gallery...";

  try {
    const rows = await api("/api/admin/gallery");

    if (!rows.length) {
      box.textContent = "No gallery photos uploaded yet.";
      return;
    }

    const list = document.createElement("div");

    list.style.display = "grid";
    list.style.gridTemplateColumns =
      "repeat(auto-fit, minmax(220px, 1fr))";
    list.style.gap = "16px";

    rows.forEach((photo) => {
      const card = document.createElement("article");

      card.className = "panel";

      const img = document.createElement("img");

      img.src = photo.image_url;
      img.alt = photo.title;
      img.loading = "lazy";
      img.style.width = "100%";
      img.style.maxHeight = "180px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "8px";

      const title = document.createElement("h3");
      title.textContent = photo.title;

      const description = document.createElement("p");
      description.textContent = photo.description || "";

      const status = document.createElement("p");

      status.textContent = photo.active
        ? "Published"
        : "Hidden";

      const toggle = document.createElement("button");

      toggle.type = "button";
      toggle.className = "btn secondary";

      toggle.textContent = photo.active
        ? "Hide photo"
        : "Publish photo";

      toggle.addEventListener("click", async () => {
        toggle.disabled = true;

        try {
          await api(`/api/admin/gallery/${photo.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              active: !photo.active
            })
          });

          await loadGallery();

        } catch (err) {
          alert(err.message);
          toggle.disabled = false;
        }
      });

      card.append(
        img,
        title,
        description,
        status,
        toggle
      );

      list.append(card);
    });

    box.replaceChildren(list);

  } catch (err) {
    box.textContent = err.message;
  }
}

// REFRESH GALLERY
const refreshGalleryButton = $("#refreshGallery");

if (refreshGalleryButton) {
  refreshGalleryButton.addEventListener(
    "click",
    loadGallery
  );
}

// LOAD APPLICATIONS
async function loadApplications() {
  const box = $("#applications");

  if (!box) return;

  box.textContent = "Loading...";

  try {
    const rows = await api("/api/admin/applications");

    const data = Array.isArray(rows) ? rows : [];

    if (!data.length) {
      box.textContent =
        "No applications have been received.";

      return;
    }

    const table = document.createElement("table");
    const head = document.createElement("tr");

    [
      "Reference / candidate",
      "Contact & profile",
      "Vacancy",
      "Status",
      "Submitted"
    ].forEach((t) => {
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

      c1.textContent =
        `${a.reference}\n${a.full_name}`;

      const c2 = document.createElement("td");

      c2.textContent =
        `Phone: ${a.phone || "Not provided"}\n` +
        `Email: ${a.email || "Not provided"}\n` +
        `Country: ${a.country || "Not provided"}\n` +
        `Occupation: ${a.occupation || "Not provided"}\n` +
        `Experience: ${a.experience || "Not provided"}\n` +
        `Education: ${a.education || "Not provided"}\n` +
        `CV: ${a.cv_status || "Not provided"}\n` +
        `${a.message || ""}`;

      const c3 = document.createElement("td");

      c3.textContent =
        a.job_title || "General profile";

      const c4 = document.createElement("td");

      const sel = document.createElement("select");

      [
        "Received",
        "Under review",
        "Shortlisted",
        "Interview",
        "Offer made",
        "Not selected",
        "Closed"
      ].forEach((s) => {
        const option = document.createElement("option");

        option.value = s;
        option.textContent = s;

        sel.append(option);
      });

      sel.value = a.status;

      sel.addEventListener("change", async () => {
        const oldStatus = a.status;

        sel.disabled = true;

        try {
          await api(
            `/api/admin/applications/${a.id}/status`,
            {
              method: "PATCH",
              body: JSON.stringify({
                status: sel.value
              })
            }
          );

          a.status = sel.value;

        } catch (err) {
          alert(err.message);
          sel.value = oldStatus;

        } finally {
          sel.disabled = false;
        }
      });

      c4.append(sel);

      const c5 = document.createElement("td");

      c5.textContent =
        new Date(a.created_at).toLocaleString();

      [c1, c2, c3, c4, c5].forEach((cell) => {
        tr.append(cell);
      });

      body.append(tr);
    });

    table.append(body);

    box.replaceChildren(table);

  } catch (err) {
    box.textContent = err.message;
  }
}

// REFRESH APPLICATIONS
const loadApplicationsButton = $("#loadApplications");

if (loadApplicationsButton) {
  loadApplicationsButton.addEventListener(
    "click",
    loadApplications
  );
}


 // EMPLOYER INVOICES
const invoiceForm = $("#invoiceForm");

if (invoiceForm) {
  invoiceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = invoiceForm.querySelector('[type="submit"]');
    const fields = Object.fromEntries(new FormData(invoiceForm).entries());
    button.disabled = true;
    msg($("#invoiceResult"), "Creating invoice...");
    try {
      const result = await api("/api/admin/invoices", {
        method: "POST",
        body: JSON.stringify(fields)
      });
      const url = new URL(result.paymentUrl, location.origin).href;
      msg($("#invoiceResult"), "Invoice " + result.invoice.reference + " created. Payment page: " + url);
      invoiceForm.reset();
      await loadInvoices();
    } catch (err) {
      msg($("#invoiceResult"), err.message, true);
    } finally {
      button.disabled = false;
    }
  });
}

async function loadInvoices() {
  const box = $("#invoicesList");
  if (!box) return;
  box.textContent = "Loading invoices...";
  try {
    const rows = await api("/api/admin/invoices");
    if (!rows.length) {
      box.textContent = "No employer invoices have been created.";
      return;
    }
    const table = document.createElement("table");
    const head = document.createElement("tr");
    ["Invoice","Employer","Base","8% fee","Total","Status","Transaction","Action"].forEach((label) => {
      const th = document.createElement("th");
      th.textContent = label;
      head.append(th);
    });
    const thead = document.createElement("thead");
    thead.append(head);
    table.append(thead);
    const body = document.createElement("tbody");
    rows.forEach((invoice) => {
      const tr = document.createElement("tr");
      const values = [
        invoice.reference,
        invoice.employer_name + "\n" + invoice.employer_email,
        Number(invoice.base_amount).toFixed(2) + " USDT",
        Number(invoice.fee_amount).toFixed(2) + " USDT",
        Number(invoice.total_amount).toFixed(2) + " USDT",
        invoice.status,
        invoice.transaction_hash || "Not submitted"
      ];
      values.forEach((value) => {
        const td = document.createElement("td");
        td.textContent = value;
        tr.append(td);
      });
      const actionCell = document.createElement("td");
      if (invoice.status === "submitted") {
        const verify = document.createElement("button");
        verify.type = "button";
        verify.className = "btn";
        verify.textContent = "Verify payment";
        verify.addEventListener("click", async () => {
          if (!confirm("Check the submitted transaction on TRON and mark invoice " + invoice.reference + " as paid only if the confirmed USDT amount matches?")) return;
          verify.disabled = true;
          try {
            await api("/api/admin/invoices/" + invoice.id + "/paid", {
              method: "PATCH",
              body: "{}"
            });
            await loadInvoices();
          } catch (err) {
            alert(err.message);
            verify.disabled = false;
          }
        });
        actionCell.append(verify);
      } else {
        actionCell.textContent = invoice.status === "paid" ? "Verified" : "Awaiting payment";
      }
      tr.append(actionCell);
      body.append(tr);
    });
    table.append(body);
    box.replaceChildren(table);
  } catch (err) {
    box.textContent = err.message;
  }
}

const refreshInvoicesButton = $("#refreshInvoices");
if (refreshInvoicesButton) refreshInvoicesButton.addEventListener("click", loadInvoices);

// START
showDashboard();
