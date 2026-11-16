
const STORAGE_KEY = "canadaWorkPermitDemoApplications";

function getApplications() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function makeReference() {
  return "CA-WP-" + Math.floor(100000 + Math.random() * 900000);
}

// =====================================
// JOB VIDEOS ON HOME PAGE
// =====================================

async function loadJobVideos() {
  const container = document.getElementById("jobVideos");

  if (!container) return;

  try {
    const response = await fetch("/api/jobs", {
      credentials: "same-origin"
    });

    if (!response.ok) {
      throw new Error("Could not load job opportunities.");
    }

    const result = await response.json();

    const jobs = Array.isArray(result)
      ? result
      : (result.jobs || []);

    const videoJobs = jobs.filter(job =>
      job.video_url || job.videoUrl
    );

    container.replaceChildren();

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

      const details = document.createElement("div");
      details.className = "job-video-details";

      const title = document.createElement("h3");
      title.textContent = job.title || job.job_title || "Job Opportunity";

      const location = document.createElement("p");
      location.textContent = "📍 " + (job.location || job.job_location || "Canada");

      const description = document.createElement("p");
      description.textContent = job.description || "";

      const apply = document.createElement("a");
      apply.className = "job-video-apply";
      apply.href = "#apply";
      apply.textContent = "Apply Now →";

      apply.addEventListener("click", () => {
        const jobTitle = document.querySelector('[name="jobTitle"]');
        const jobLocation = document.querySelector('[name="jobLocation"]');

        if (jobTitle) jobTitle.value = title.textContent;
        if (jobLocation) jobLocation.value = location.textContent.replace("📍 ", "");

        document.getElementById("apply")?.scrollIntoView({
          behavior: "smooth"
        });
      });

      details.append(title, location);

      if (description.textContent) {
        details.appendChild(description);
      }

      details.appendChild(apply);
      card.append(video, details);
      container.appendChild(card);
    });

  } catch (error) {
    console.error("Job video loading error:", error);
    showEmptyVideos(container);
  }
}

function showEmptyVideos(container) {
  const empty = document.createElement("div");
  empty.className = "job-video-empty";

  const icon = document.createElement("div");
  icon.className = "video-placeholder-icon";
  icon.textContent = "▶";

  const heading = document.createElement("h3");
  heading.textContent = "Job videos coming soon";

  const message = document.createElement("p");
  message.textContent =
    "New employment opportunity videos will appear here when published.";

  empty.append(icon, heading, message);
  container.replaceChildren(empty);
}

// =====================================
// APPLICATION FORM
// =====================================

const applicationForm = document.getElementById("applicationForm");

if (applicationForm) {
  applicationForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const form = event.currentTarget;

    if (!form.reportValidity()) return;

    const data = Object.fromEntries(
      new FormData(form).entries()
    );

    data.documents = new FormData(form).getAll("documents");
    data.reference = makeReference();
    data.status = "Received (demo)";
    data.createdAt = new Date().toISOString();

    const applications = getApplications();

    applications.push(data);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(applications)
    );

    const message = document.getElementById("formMessage");

    message.textContent =
      `Demo application saved. Your reference number is ${data.reference}. Keep it to check the sample status below.`;

    document.getElementById("reference").value = data.reference;

    form.reset();

    document.getElementById("tracking").scrollIntoView({
      behavior: "smooth"
    });
  });
}

// =====================================
// APPLICATION TRACKING
// =====================================

const trackingForm = document.getElementById("trackingForm");

if (trackingForm) {
  trackingForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const reference = document
      .getElementById("reference")
      .value.trim()
      .toUpperCase();

    const match = getApplications().find(
      app => app.reference === reference
    );

    const result = document.getElementById("trackingResult");

    if (match) {
      result.textContent =
        `Status: ${match.status}. Saved on this device as a demonstration record.`;
    } else {
      result.textContent =
        "No demo application found on this device. Check the reference number and try again.";
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
// LOAD HOME PAGE VIDEOS
// =====================================

loadJobVideos();
