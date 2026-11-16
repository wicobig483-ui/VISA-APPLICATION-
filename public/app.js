
const $ = (s) => document.querySelector(s);

function show(el, message, error = false) {
  if (!el) return;

  el.textContent = message;
  el.classList.toggle("error", error);
}

async function api(url, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (
    options.body &&
    !(options.body instanceof FormData)
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

/* =====================================
   LOAD JOB VACANCIES AND VIDEOS
===================================== */

async function loadJobs() {
  const box = $("#jobs");
  const select = $("#jobSelect") || $('input[name="jobId"]');

  if (!box) return;

  box.textContent = "Loading vacancies...";

  try {
    const jobs = await api("/api/jobs");

    box.replaceChildren();

    if (select && select.tagName === "SELECT") {
      select.innerHTML =
        '<option value="">General profile registration</option>';
    }

    if (!Array.isArray(jobs) || !jobs.length) {
      box.textContent =
        "No vacancies are currently published. You may still submit a general profile.";
      return;
    }

    jobs.forEach((job) => {
      const card = document.createElement("article");
      card.className = "job";

      // VACANCY PHOTO
      if (job.image_url) {
        const img = document.createElement("img");

        img.src = job.image_url;
        img.alt = job.title || "Job vacancy photo";
        img.loading = "lazy";
        img.className = "job-image";

        img.addEventListener("error", () => img.remove());

        card.append(img);
      }

      // JOB VIDEO
      if (job.video_url) {
        try {
          const videoUrl = new URL(job.video_url);

          if (videoUrl.protocol === "https:") {
            const video = document.createElement("video");

            video.className = "job-video-player";
            video.controls = true;
            video.playsInline = true;
            video.preload = "metadata";
            video.setAttribute("controlsList", "nodownload");

            if (job.image_url) {
              video.poster = job.image_url;
            }

            video.src = videoUrl.href;

            video.addEventListener("error", () => {
              const errorMessage = document.createElement("p");

              errorMessage.className = "video-error";
              errorMessage.textContent =
                "This job video could not be played.";

              video.replaceWith(errorMessage);
            });

            card.append(video);
          }
        } catch (error) {
          console.error("Invalid job video URL:", error);
        }
      }

      // JOB TITLE
      const heading = document.createElement("h3");
      heading.textContent = job.title || "Job opportunity";

      // LOCATION AND EMPLOYMENT TYPE
      const location = document.createElement("p");
      location.className = "muted";
      location.textContent =
        `${job.location || ""} · ${job.employment_type || ""}`;

      // DESCRIPTION
      const description = document.createElement("p");
      description.textContent = job.description || "";

      // REQUIREMENTS
      const requirements = document.createElement("p");
      requirements.textContent = job.requirements
        ? `Requirements: ${job.requirements}`
        : "";

      // APPLY BUTTON
      const applyButton = document.createElement("button");

      applyButton.type = "button";
      applyButton.className = "btn secondary";
      applyButton.textContent = "Apply for this job";

      applyButton.addEventListener("click", () => {
        if (select) {
          select.value = String(job.id);
        }

        const hiddenJobId = $('input[name="jobId"]');

        if (hiddenJobId) {
          hiddenJobId.value = String(job.id);
        }

        const applicationSection =
          $("#apply") || $("#application");

        if (applicationSection) {
          applicationSection.scrollIntoView({
            behavior: "smooth"
          });
        } else {
          location.hash = "apply";
        }
      });

      card.append(
        heading,
        location,
        description,
        requirements,
        applyButton
      );

      box.append(card);

      // APPLICATION DROPDOWN
      if (select && select.tagName === "SELECT") {
        const option = document.createElement("option");

        option.value = String(job.id);
        option.textContent =
          `${job.title} — ${job.location}`;

        select.append(option);
      }
    });

  } catch (error) {
    box.textContent = error.message;
    console.error("Jobs loading error:", error);
  }
}

/* =====================================
   LOAD HOMEPAGE GALLERY
===================================== */

async function loadGalleryPhotos() {
  const gallery = $("#canadaGalleryGrid");

  if (!gallery) return;

  try {
    const photos = await api("/api/gallery");

    gallery.replaceChildren();

    if (!photos.length) {
      gallery.textContent = "No photos available yet.";
      return;
    }

    photos.forEach((photo) => {
      const card = document.createElement("article");
      card.className = "gallery-card";

      const img = document.createElement("img");

      img.src = photo.image_url;
      img.alt = photo.title || "Canada job opportunity";
      img.loading = "lazy";

      img.addEventListener("error", () => {
        img.alt = "Photo could not be loaded";
      });

      const title = document.createElement("h3");
      title.textContent = photo.title || "";

      const description = document.createElement("p");
      description.textContent = photo.description || "";

      card.append(img, title, description);
      gallery.append(card);
    });

  } catch (error) {
    gallery.textContent = "Unable to load gallery photos.";
    console.error("Gallery error:", error);
  }
}

/* =====================================
   RELOAD JOBS BUTTON
===================================== */

const reloadJobsButton = $("#reloadJobs");

if (reloadJobsButton) {
  reloadJobsButton.addEventListener("click", loadJobs);
}

/* =====================================
   APPLICATION FORM
===================================== */

const applicationForm = $("#applicationForm");

if (applicationForm) {
  applicationForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.currentTarget;

    const result =
      $("#formMessage") || $("#applyResult");

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    const consentField = form.querySelector(
      '[name="consent"]'
    );

    payload.phone = String(payload.phone || "").trim();

    // Server expects a Boolean, not "on" or "yes".
    payload.consent = Boolean(
      consentField && consentField.checked
    );

    // Ensure the job ID is a valid number or null.
    const jobId = Number(payload.jobId);

    payload.jobId =
      Number.isSafeInteger(jobId) && jobId > 0
        ? jobId
        : null;

    const button = form.querySelector(
      '[type="submit"]'
    );

    if (button) button.disabled = true;

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

    } catch (error) {
      show(result, error.message, true);

    } finally {
      if (button) button.disabled = false;
    }
  });
}

/* =====================================
   APPLICATION TRACKING
===================================== */

const trackingForm =
  $("#trackingForm") || $("#trackForm");

if (trackingForm) {
  trackingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.currentTarget;

    const result =
      $("#trackingResult") || $("#trackResult");

    const formData = new FormData(form);

    const payload = Object.fromEntries(
      formData.entries()
    );

    try {
      const data = await api("/api/track", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      show(
        result,
        `Reference: ${data.reference} · Status: ${data.status} · Vacancy: ${data.job_title || "General profile"} · Last updated: ${new Date(data.updated_at).toLocaleString()}`
      );

    } catch (error) {
      show(result, error.message, true);
    }
  });
}

/* =====================================
   START WEBSITE
===================================== */

loadJobs();
loadGalleryPhotos();
