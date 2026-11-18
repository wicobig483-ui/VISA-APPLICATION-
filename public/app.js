
"use strict";

const $ = (selector, root = document) => root.querySelector(selector);

function show(target, message, isError = false) {
  if (!target) return;
  target.textContent = message || "";
  target.classList.toggle("error", Boolean(isError));
  target.classList.toggle("success", Boolean(message) && !isError);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : {};

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      `Request failed (${response.status}).`
    );
  }

  return data;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) element.className = className;

  if (text !== undefined && text !== null) {
    element.textContent = String(text);
  }

  return element;
}

function addMedia(card, url, type, altText) {
  if (!url) return;

  if (type === "video") {
    const video = createElement("video", "job-video");
    video.src = url;
    video.controls = true;
    video.preload = "metadata";
    video.playsInline = true;
    video.setAttribute("aria-label", altText || "Vacancy video");
    card.appendChild(video);
    return;
  }

  const image = createElement("img", "job-image");
  image.src = url;
  image.alt = altText || "Job image";
  image.loading = "lazy";
  card.appendChild(image);
}

function renderJob(job) {
  const card = createElement("article", "job-card");

  const title = createElement(
    "h3",
    "job-title",
    job.title || "Vacancy"
  );

  card.appendChild(title);

  if (job.location) {
    card.appendChild(
      createElement("p", "job-location", job.location)
    );
  }

  if (job.employment_type) {
    card.appendChild(
      createElement("p", "job-type", job.employment_type)
    );
  }

  addMedia(card, job.image_url, "image", `${job.title || "Job"} image`);
  addMedia(card, job.video_url, "video", `${job.title || "Job"} video`);

  if (job.description) {
    card.appendChild(
      createElement("p", "job-description", job.description)
    );
  }

  if (job.requirements) {
    const requirements = createElement("p", "job-requirements");
    const label = createElement("strong", "", "Requirements: ");

    requirements.append(
      label,
      document.createTextNode(job.requirements)
    );

    card.appendChild(requirements);
  }

  const applyButton = createElement(
    "button",
    "apply-job-button",
    "Apply for this job"
  );

  applyButton.type = "button";

  applyButton.addEventListener("click", () => {
    const jobSelect = $("#jobSelect");

    if (jobSelect) {
      jobSelect.value = String(job.id);
    }

    const applySection = $("#apply");

    if (applySection) {
      applySection.scrollIntoView({ behavior: "smooth" });
    }
  });

  card.appendChild(applyButton);

  return card;
}

async function loadJobs() {
  const jobsContainer = $("#jobs");
  const jobSelect = $("#jobSelect");

  if (!jobsContainer) return;

  jobsContainer.replaceChildren(
    createElement("p", "loading", "Loading vacancies…")
  );

  try {
    const jobs = await api("/api/jobs", {
      method: "GET",
      headers: {}
    });

    jobsContainer.replaceChildren();

    if (!Array.isArray(jobs) || jobs.length === 0) {
      jobsContainer.appendChild(
        createElement(
          "p",
          "empty-state",
          "There are no active vacancies at the moment."
        )
      );
    } else {
      jobs.forEach(job => {
        jobsContainer.appendChild(renderJob(job));
      });
    }

    if (jobSelect) {
      const previousValue = jobSelect.value;

      jobSelect.replaceChildren();

      const placeholder = createElement(
        "option",
        "",
        "Select a vacancy"
      );

      placeholder.value = "";
      jobSelect.appendChild(placeholder);

      jobs.forEach(job => {
        const option = createElement(
          "option",
          "",
          job.title || `Vacancy ${job.id}`
        );

        option.value = String(job.id);
        jobSelect.appendChild(option);
      });

      if (jobs.some(job => String(job.id) === previousValue)) {
        jobSelect.value = previousValue;
      }
    }
  } catch (error) {
    jobsContainer.replaceChildren(
      createElement("p", "error", error.message)
    );
  }
}

async function loadGalleryPhotos() {
  const gallery = $("#canadaGalleryGrid");

  if (!gallery) return;

  try {
    const photos = await api("/api/gallery", {
      method: "GET",
      headers: {}
    });

    gallery.replaceChildren();

    if (!Array.isArray(photos) || photos.length === 0) {
      gallery.appendChild(
        createElement(
          "p",
          "empty-state",
          "Gallery photos will appear here."
        )
      );

      return;
    }

    photos.forEach(photo => {
      if (!photo.image_url) return;

      const item = createElement("figure", "gallery-item");
      const image = createElement("img", "gallery-image");

      image.src = photo.image_url;
      image.alt = photo.title || "Recruitment gallery photo";
      image.loading = "lazy";

      item.appendChild(image);

      if (photo.title) {
        item.appendChild(
          createElement("figcaption", "gallery-caption", photo.title)
        );
      }

      gallery.appendChild(item);
    });
  } catch (error) {
    gallery.replaceChildren(
      createElement("p", "error", error.message)
    );
  }
}

/* PAYPAL PAYMENT INSTRUCTIONS */

function showPaymentInstructions(target, data) {
  if (!target) return;

  target.replaceChildren();

  const addLine = (text, className) => {
    const line = createElement("span", className || "", text);

    target.appendChild(line);
    target.appendChild(document.createElement("br"));
  };

  addLine(
    data.message || "Your application has been received.",
    "success"
  );

  addLine(
    `Your application reference: ${data.reference || "Not provided"}`,
    "application-reference"
  );

  addLine(
    `Agency application-processing fee: ${data.processingFee || "USD 40"}`,
    "processing-fee"
  );

  addLine(
    data.paymentNotice ||
      "This is an agency processing fee, not a Canadian government or IRCC visa fee. Payment does not guarantee employment or visa approval.",
    "payment-disclaimer"
  );

  addLine(
    "If you choose to pay this agency processing fee, use the PayPal link below. Keep your application reference for your records.",
    "payment-instructions"
  );

  const paymentLink = createElement(
    "a",
    "paypal-payment-button",
    "Pay USD 40 with PayPal"
  );

  paymentLink.href =
    data.paymentUrl ||
    "https://www.paypal.com/ncp/payment/BPZVY3EVXS2S4";

  paymentLink.target = "_blank";
  paymentLink.rel = "noopener noreferrer";

  target.appendChild(paymentLink);
  target.appendChild(document.createElement("br"));

  addLine(
    "Payment is not confirmed by this website. The agency must verify the transaction separately.",
    "payment-status-note"
  );
}

/* RELOAD VACANCIES */

const reloadJobsButton = $("#reloadJobs");

if (reloadJobsButton) {
  reloadJobsButton.addEventListener("click", loadJobs);
}

/* APPLICATION SUBMISSION */

const applicationForm = $("#applicationForm");

if (applicationForm) {
  applicationForm.addEventListener("submit", async event => {
    event.preventDefault();

    const result = $("#applyResult");

    const submitButton = applicationForm.querySelector(
      'button[type="submit"], button:not([type]), input[type="submit"]'
    );

    if (submitButton) {
      submitButton.disabled = true;
    }

    show(result, "Submitting your application…");

    try {
      const formData = new FormData(applicationForm);
      const payload = Object.fromEntries(formData.entries());

      const consentInput = applicationForm.querySelector(
        '[name="consent"]'
      );

      payload.consent = Boolean(
        consentInput && consentInput.checked
      );

      const data = await api("/api/applications", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      showPaymentInstructions(result, data);

      applicationForm.reset();

    } catch (error) {
      show(result, error.message, true);

    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
}

/* APPLICATION TRACKING */

const trackForm = $("#trackForm");

if (trackForm) {
  trackForm.addEventListener("submit", async event => {
    event.preventDefault();

    const result = $("#trackResult");

    show(result, "Checking your application…");

    try {
      const formData = new FormData(trackForm);
      const payload = Object.fromEntries(formData.entries());

      const data = await api("/api/track", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      const details = [
        `Reference: ${data.reference}`,
        `Status: ${data.status}`,
        `Vacancy: ${data.job_title || "Not specified"}`,
        data.updated_at
          ? `Last updated: ${new Date(data.updated_at).toLocaleString()}`
          : ""
      ].filter(Boolean);

      show(result, details.join("\n"));
      result.style.whiteSpace = "pre-line";

    } catch (error) {
      show(result, error.message, true);
    }
  });
}

/* INITIALIZE WEBSITE */

loadJobs();
loadGalleryPhotos();
