
// =====================================
// GENERAL HELPERS
// =====================================

async function api(url, options = {}) {
  const headers = {
    ...(options.headers || {})
  };

  if (
    options.body &&
    typeof options.body === "string"
  ) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || "Something went wrong. Please try again."
    );
  }

  return data;
}

function getField(form, names) {
  for (const name of names) {
    const field =
      form.querySelector(`[name="${name}"]`) ||
      form.querySelector(`#${name}`);

    if (field) return field;
  }

  return null;
}

function getValue(form, names) {
  const field = getField(form, names);

  return field
    ? String(field.value || "").trim()
    : "";
}

function showMessage(element, message, error = false) {
  if (!element) return;

  element.textContent = message;
  element.classList.toggle("error", error);
}

// =====================================
// JOB VIDEOS ON HOME PAGE
// =====================================

async function loadJobVideos() {
  const container = document.getElementById("jobVideos");

  if (!container) return;

  try {
    const jobs = await api("/api/jobs");

    container.replaceChildren();

    const videoJobs = jobs.filter(job => {
      const url = job.video_url || job.videoUrl;

      if (typeof url !== "string") return false;

      try {
        const parsedUrl = new URL(url);

        return parsedUrl.protocol === "https:";
      } catch {
        return false;
      }
    });

    if (videoJobs.length === 0) {
      showEmptyVideos(container);
      return;
    }

    videoJobs.forEach(job => {
      const videoUrl = job.video_url || job.videoUrl;

      const card = document.createElement("article");
      card.className = "job-video-card";

      const video = document.createElement("video");
      video.className = "job-video-player";
      video.src = videoUrl;
      video.controls = true;
      video.playsInline = true;
      video.preload = "metadata";

      video.addEventListener("error", () => {
        const unavailable = document.createElement("p");
        unavailable.className = "video-error";
        unavailable.textContent =
          "This video is currently unavailable.";

        video.replaceWith(unavailable);
      });

      const details = document.createElement("div");
      details.className = "job-video-details";

      const title = document.createElement("h3");
      title.textContent = job.title || "Job Opportunity";

      const location = document.createElement("p");
      location.textContent =
        "📍 " + (job.location || "Canada");

      const description = document.createElement("p");
      description.textContent = job.description || "";

      const apply = document.createElement("a");
      apply.className = "job-video-apply";
      apply.href = "#apply";
      apply.textContent = "Apply Now →";

      apply.addEventListener("click", () => {
        const applicationForm =
          document.getElementById("applicationForm");

        if (!applicationForm) return;

        const occupation = getField(applicationForm, [
          "occupation",
          "jobTitle",
          "job_title"
        ]);

        const jobId = getField(applicationForm, [
          "jobId",
          "job_id"
        ]);

        if (occupation) {
          occupation.value = job.title || "";
        }

        if (jobId) {
          jobId.value = job.id || "";
        }

        document.getElementById("apply")?.scrollIntoView({
          behavior: "smooth"
        });
      });

      details.append(title, location);

      if (description.textContent.trim()) {
        details.appendChild(description);
      }

      details.appendChild(apply);

      card.append(video, details);
      container.appendChild(card);
    });

  } catch (error) {
    console.error("Job video loading error:", error);

    showEmptyVideos(
      container,
      "Unable to load job videos. Please try again later."
    );
  }
}

function showEmptyVideos(container, message) {
  const empty = document.createElement("div");
  empty.className = "job-video-empty";

  const icon = document.createElement("div");
  icon.className = "video-placeholder-icon";
  icon.textContent = "▶";

  const heading = document.createElement("h3");
  heading.textContent = "Job videos";

  const text = document.createElement("p");
  text.textContent = message ||
    "New employment opportunity videos will appear here when published.";

  empty.append(icon, heading, text);

  container.replaceChildren(empty);
}

// =====================================
// APPLICATION SUBMISSION
// =====================================

const applicationForm =
  document.getElementById("applicationForm");

if (applicationForm) {
  applicationForm.addEventListener("submit", async event => {
    event.preventDefault();

    const form = event.currentTarget;

    if (!form.reportValidity()) return;

    const submitButton = form.querySelector(
      '[type="submit"]'
    );

    const message = document.getElementById("formMessage");

    const consentField = getField(form, ["consent"]);

    const rawJobId = getValue(form, [
      "jobId",
      "job_id"
    ]);

    const jobId = rawJobId
      ? Number(rawJobId)
      : null;

    if (
      jobId !== null &&
      (!Number.isSafeInteger(jobId) || jobId < 1)
    ) {
      showMessage(
        message,
        "The selected vacancy is invalid. Please select the vacancy again.",
        true
      );

      return;
    }

    const payload = {
      fullName: getValue(form, [
        "fullName",
        "full_name",
        "name"
      ]),

      email: getValue(form, [
        "email"
      ]),

      phone: getValue(form, [
        "phone",
        "phoneNumber"
      ]),

      country: getValue(form, [
        "country"
      ]),

      occupation: getValue(form, [
        "occupation",
        "jobTitle",
        "job_title"
      ]),

      experience: getValue(form, [
        "experience"
      ]),

      education: getValue(form, [
        "education"
      ]),

      cvStatus: getValue(form, [
        "cvStatus",
        "cv_status"
      ]),

      jobId,

      message: getValue(form, [
        "message"
      ]),

      // The server requires a Boolean value.
      consent: Boolean(
        consentField && consentField.checked
      )
    };

    if (!payload.consent) {
      showMessage(
        message,
        "Please confirm the consent statement before submitting.",
        true
      );

      return;
    }

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";
      }

      showMessage(
        message,
        "Submitting your application..."
      );

      const result = await api("/api/applications", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (!result.reference) {
        throw new Error(
          "Your application was submitted, but no reference number was returned. Please contact the recruitment team."
        );
      }

      showMessage(
        message,
        `Your application has been received successfully. Your reference number is ${result.reference}. Please keep this number for tracking.`
      );

      // Save the reference in the tracking form.
      const referenceField =
        document.getElementById("reference");

      if (referenceField) {
        referenceField.value = result.reference;
      }

      // Reset the application form after success.
      form.reset();

      const jobIdField = getField(form, [
        "jobId",
        "job_id"
      ]);

      if (jobIdField) {
        jobIdField.value = "";
      }

    } catch (error) {
      console.error("Application submission error:", error);

      showMessage(
        message,
        error.message,
        true
      );

    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML =
          'Submit Application <span>→</span>';
      }
    }
  });
}

// =====================================
// APPLICATION TRACKING
// =====================================

const trackingForm =
  document.getElementById("trackingForm");

if (trackingForm) {
  trackingForm.addEventListener("submit", async event => {
    event.preventDefault();

    const form = event.currentTarget;

    if (!form.reportValidity()) return;

    const reference = getValue(form, [
      "reference",
      "trackingReference"
    ]).toUpperCase();

    const email = getValue(form, [
      "email",
      "trackingEmail"
    ]).toLowerCase();

    const resultBox =
      document.getElementById("trackingResult");

    const submitButton = form.querySelector(
      '[type="submit"]'
    );

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Checking...";
      }

      showMessage(
        resultBox,
        "Checking your application..."
      );

      const result = await api("/api/track", {
        method: "POST",
        body: JSON.stringify({
          reference,
          email
        })
      });

      resultBox.replaceChildren();

      const heading = document.createElement("h3");
      heading.textContent = "Application Found";

      const referenceText = document.createElement("p");
      referenceText.textContent =
        "Reference: " + result.reference;

      const statusText = document.createElement("p");
      statusText.textContent =
        "Status: " + result.status;

      resultBox.append(
        heading,
        referenceText,
        statusText
      );

      if (result.job_title) {
        const jobText = document.createElement("p");

        jobText.textContent =
          "Position: " + result.job_title;

        resultBox.appendChild(jobText);
      }

      if (result.created_at) {
        const dateText = document.createElement("p");

        dateText.textContent =
          "Submitted: " +
          new Date(result.created_at).toLocaleString();

        resultBox.appendChild(dateText);
      }

      if (result.updated_at) {
        const updatedText = document.createElement("p");

        updatedText.textContent =
          "Last updated: " +
          new Date(result.updated_at).toLocaleString();

        resultBox.appendChild(updatedText);
      }

      resultBox.classList.remove("error");

    } catch (error) {
      console.error("Application tracking error:", error);

      showMessage(
        resultBox,
        error.message,
        true
      );

    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Track Application";
      }
    }
  });
}

// =====================================
// TRACK APPLICATION NAVIGATION
// =====================================

const trackNav = document.getElementById("trackNav");

if (trackNav) {
  trackNav.addEventListener("click", () => {
    document.getElementById("tracking")?.scrollIntoView({
      behavior: "smooth"
    });
  });
}

// =====================================
// LOAD HOMEPAGE CONTENT
// =====================================

loadJobVideos();
