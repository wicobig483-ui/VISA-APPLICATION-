
const $ = (s) => document.querySelector(s);

function show(el, message, error = false) {
  el.textContent = message;
  el.classList.toggle("error", error);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...options
  });

  const data = await response.json().catch(() => ({
    error: "Unexpected server response."
  }));

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

/* LOAD JOB VACANCIES */

async function loadJobs() {
  const box = $("#jobs");
  const select = $("#jobSelect");

  try {
    const jobs = await api("/api/jobs");

    box.innerHTML = "";
    select.innerHTML =
      '<option value="">General profile registration</option>';

    if (!jobs.length) {
      box.innerHTML =
        "<p>No vacancies are currently published. You may still submit a general profile.</p>";
      return;
    }

    jobs.forEach(j => {
      const card = document.createElement("article");
      card.className = "job";

      const h = document.createElement("h3");
      h.textContent = j.title;

      const loc = document.createElement("p");
      loc.className = "muted";
      loc.textContent = `${j.location} · ${j.employment_type}`;

      const desc = document.createElement("p");
      desc.textContent = j.description;

      const req = document.createElement("p");
      req.textContent = j.requirements
        ? `Requirements: ${j.requirements}`
        : "";

      const choose = document.createElement("button");
      choose.className = "btn secondary";
      choose.textContent = "Apply for this job";

      choose.addEventListener("click", () => {
        select.value = String(j.id);
        location.hash = "apply";
      });

      card.append(h, loc, desc, req, choose);
      box.append(card);

      const opt = document.createElement("option");
      opt.value = j.id;
      opt.textContent = j.title + " — " + j.location;
      select.append(opt);
    });

  } catch (e) {
    box.textContent = e.message;
  }
}

/* LOAD GALLERY PHOTOS */

async function loadGalleryPhotos() {
  const gallery = $("#canadaGalleryGrid");

  if (!gallery) {
    console.error("Gallery container was not found.");
    return;
  }

  try {
    const photos = await api("/api/gallery");

    gallery.innerHTML = "";

    if (!photos.length) {
      gallery.textContent = "No photos available yet.";
      return;
    }

    photos.forEach(photo => {
      const card = document.createElement("article");
      card.className = "gallery-card";

      const img = document.createElement("img");
      img.src = photo.image_url;
      img.alt = photo.title || "Canada job opportunity";
      img.loading = "lazy";

      const title = document.createElement("h3");
      title.textContent = photo.title || "";

      const description = document.createElement("p");
      description.textContent = photo.description || "";

      img.addEventListener("error", () => {
        img.alt = "Photo could not be loaded";
      });

      card.append(img, title, description);
      gallery.append(card);
    });

  } catch (error) {
    gallery.textContent = "Unable to load gallery photos.";
    console.error("Gallery error:", error);
  }
}

/* RELOAD JOBS BUTTON */

$("#reloadJobs").addEventListener("click", loadJobs);

/* APPLICATION FORM */

$("#applicationForm").addEventListener("submit", async e => {
  e.preventDefault();

  const form = e.currentTarget;
  const result = $("#applyResult");

  const f = new FormData(form);
  const payload = Object.fromEntries(f.entries());

  // Include the applicant's phone number.
  payload.phone = (f.get("phone") || "").toString().trim();

  payload.consent = f.get("consent") === "on";
  payload.jobId = payload.jobId || null;

  try {
    const data = await api("/api/applications", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    show(
      result,
      `${data.message} Your tracking reference is ${data.reference}. Save it and use the same email address in the tracking section.`
    );

    form.reset();

  } catch (err) {
    show(result, err.message, true);
  }
});

/* APPLICATION TRACKING FORM */

$("#trackForm").addEventListener("submit", async e => {
  e.preventDefault();

  const f = new FormData(e.currentTarget);

  try {
    const d = await api("/api/track", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(f.entries()))
    });

    show(
      $("#trackResult"),
      `Reference: ${d.reference} · Status: ${d.status} · Vacancy: ${d.job_title || "General profile"} · Last updated: ${new Date(d.updated_at).toLocaleString()}`
    );

  } catch (err) {
    show($("#trackResult"), err.message, true);
  }
});

/* START WEBSITE FEATURES */

loadJobs();
loadGalleryPhotos();
