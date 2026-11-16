
const $ = (s) => document.querySelector(s);

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

// UPLOAD IMAGE TO CLOUDINARY THROUGH SERVER
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

// UPLOAD VIDEO TO CLOUDINARY THROUGH SERVER
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
      loadGallery()
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

// PUBLISH VACANCY WITH OPTIONAL PHOTO AND VIDEO
const jobForm = $("#jobForm");

if (jobForm) {
  jobForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const button = jobForm.querySelector('[type="submit"]');

    const imageFile = $("#jobImage")?.files[0] || null;
    const videoFile = $("#jobVideo")?.files[0] || null;

    const formData = Object.fromEntries(
      new FormData(jobForm).entries()
    );

    delete formData.image;
    delete formData.video;

    button.disabled = true;

    try {
      let image = null;
      let video = null;

      // UPLOAD IMAGE
      if (imageFile) {
        msg(
          $("#jobResult"),
          "Uploading vacancy photo..."
        );

        image = await uploadImage(imageFile);
      }

      // UPLOAD VIDEO
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
        ...formData,

        imageUrl: image ? image.url : null,
        imagePublicId: image ? image.publicId : null,

        videoUrl: video ? video.url : null,
        videoPublicId: video ? video.publicId : null
      };

      msg(
        $("#jobResult"),
        "Publishing vacancy..."
      );

      // SAVE VACANCY
      await api("/api/admin/jobs", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      msg(
        $("#jobResult"),
        "Vacancy and its media published successfully!"
      );

      msg($("#videoResult"), "");

      // RESET FORM
      jobForm.reset();

      if ($("#jobPreview")) {
        $("#jobPreview").hidden = true;
        $("#jobPreview").removeAttribute("src");
      }

      if (jobVideoPreview) {
        jobVideoPreview.pause();
        jobVideoPreview.hidden = true;
        jobVideoPreview.removeAttribute("src");
        jobVideoPreview.load();
      }

      // RELEASE PREVIEW URL
      if (jobVideoPreview && jobVideoInput) {
        // The next video selection will also release its previous URL.
      }

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

      // CONTACT DETAILS INCLUDING PHONE NUMBER
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

// START
showDashboard();
