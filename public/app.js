
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

/* =========================================
   CANADA INFORMATION CENTRE
========================================= */

const canadaInformation = [
  {
    title: "Jobs and employment",
    description:
      "Learn how to search for jobs, prepare a Canadian-style résumé, understand job requirements and explore employment opportunities.",
    topics: [
      {
        title: "Finding a job in Canada",
        text:
          "Search for vacancies, review job descriptions and check the qualifications requested by employers. International applicants should check whether an employer is recruiting candidates from outside Canada.",
        links: [
          {
            label: "Search for jobs on Job Bank",
            url: "https://www.jobbank.gc.ca/home"
          },
          {
            label: "Government of Canada job-search guidance",
            url: "https://www.canada.ca/en/services/jobs/opportunities.html"
          }
        ]
      },
      {
        title: "Applying for jobs",
        text:
          "Prepare a résumé that clearly describes your experience, education, training and skills. Follow the employer's application instructions and provide accurate information.",
        links: [
          {
            label: "Job Bank career planning",
            url: "https://www.jobbank.gc.ca/career-planning"
          }
        ]
      },
      {
        title: "Foreign candidates",
        text:
          "If you are outside Canada, look for employers who are willing to recruit international candidates. Check the vacancy requirements and your eligibility before applying.",
        links: [
          {
            label: "Information for foreign candidates",
            url: "https://www.jobbank.gc.ca/findajob/foreign-candidates"
          }
        ]
      }
    ]
  },

  {
    title: "Work permits and working in Canada",
    description:
      "Understand the main work permit options and the steps that may apply when a foreign national wants to work in Canada.",
    topics: [
      {
        title: "What is a work permit?",
        text:
          "A work permit is an authorization that allows an eligible foreign national to work in Canada under the conditions stated on the permit. Most foreign nationals need a work permit to work in Canada, although some exemptions exist.",
        links: [
          {
            label: "Official work permit information",
            url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada.html"
          }
        ]
      },
      {
        title: "Employer-specific work permits",
        text:
          "An employer-specific work permit generally identifies the employer, location and type of work permitted. The applicant must meet the applicable requirements.",
        links: [
          {
            label: "Employer-specific work permits",
            url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/permit.html"
          }
        ]
      },
      {
        title: "Open work permits",
        text:
          "An open work permit may allow an eligible person to work for different employers, subject to the conditions and restrictions printed on the permit. Not everyone qualifies.",
        links: [
          {
            label: "Open work permit information",
            url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/permit.html"
          }
        ]
      }
    ]
  },

  {
    title: "LMIA and employer requirements",
    description:
      "Learn what a Labour Market Impact Assessment is and why some Canadian employers need one before hiring a foreign worker.",
    topics: [
      {
        title: "What is an LMIA?",
        text:
          "A Labour Market Impact Assessment is a document that an employer may need from Employment and Social Development Canada before hiring a temporary foreign worker. A positive LMIA generally indicates that the employer can hire a foreign worker for the position under the applicable program.",
        links: [
          {
            label: "Temporary Foreign Worker Program",
            url: "https://www.canada.ca/en/employment-social-development/services/foreign-workers.html"
          }
        ]
      },
      {
        title: "Does every job require an LMIA?",
        text:
          "No. Some work permit categories are LMIA-exempt. Whether an LMIA is required depends on the job, the employer and the immigration program.",
        links: [
          {
            label: "LMIA-exempt work permits",
            url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/permit.html"
          }
        ]
      },
      {
        title: "Important information for applicants",
        text:
          "An LMIA is not a work permit, and a job offer does not automatically guarantee a work permit or visa approval. Immigration authorities assess each application under the applicable rules."
      }
    ]
  },

  {
    title: "Immigration and citizenship",
    description:
      "Explore information about coming to Canada temporarily or permanently, immigration programs and citizenship.",
    topics: [
      {
        title: "Immigrating to Canada",
        text:
          "Canada has different immigration programs. Eligibility depends on the program's requirements, which may include work experience, education, language ability and other factors.",
        links: [
          {
            label: "Explore immigration programs",
            url: "https://www.canada.ca/en/services/immigration-citizenship.html"
          }
        ]
      },
      {
        title: "Express Entry",
        text:
          "Express Entry is an online system used to manage applications for certain economic immigration programs. Candidates must meet the requirements of the relevant program.",
        links: [
          {
            label: "Express Entry",
            url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html"
          }
        ]
      },
      {
        title: "Permanent residence",
        text:
          "Permanent residence allows an eligible person to live in Canada permanently, subject to the legal conditions of permanent resident status.",
        links: [
          {
            label: "Permanent residence information",
            url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/permanent-residents.html"
          }
        ]
      },
      {
        title: "Canadian citizenship",
        text:
          "Permanent residents who meet the legal requirements may be eligible to apply for Canadian citizenship.",
        links: [
          {
            label: "Citizenship information",
            url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-citizenship.html"
          }
        ]
      }
    ]
  },

  {
    title: "Salary, occupations and qualifications",
    description:
      "Research Canadian occupations, typical wages, job duties and the qualifications employers may request.",
    topics: [
      {
        title: "Explore occupations",
        text:
          "Compare occupations and review job duties, skills, education requirements and employment information before choosing a career path.",
        links: [
          {
            label: "Explore careers on Job Bank",
            url: "https://www.jobbank.gc.ca/career-planning"
          }
        ]
      },
      {
        title: "Compare wages",
        text:
          "Wages vary by occupation, location, experience, employer and working conditions. Check current wage information rather than relying on a general salary estimate.",
        links: [
          {
            label: "Canadian wage information",
            url: "https://www.jobbank.gc.ca/trend-analysis/search-wages"
          }
        ]
      },
      {
        title: "Foreign credentials",
        text:
          "Some occupations require a Canadian licence or recognition of foreign qualifications. Requirements vary by province, territory and profession.",
        links: [
          {
            label: "Foreign credential recognition",
            url: "https://www.canada.ca/en/employment-social-development/services/foreign-credentials.html"
          }
        ]
      }
    ]
  },

  {
    title: "Studying in Canada",
    description:
      "Find information about study permits, designated learning institutions and studying as an international student.",
    topics: [
      {
        title: "Study permits",
        text:
          "Many foreign nationals need a study permit to study in Canada. Applicants should review the current eligibility rules and required documents before applying.",
        links: [
          {
            label: "Apply for a study permit",
            url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html"
          }
        ]
      },
      {
        title: "Designated learning institutions",
        text:
          "Before applying to study, check whether the school is a designated learning institution and review any additional program requirements.",
        links: [
          {
            label: "Find a designated learning institution",
            url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare/designated-learning-institutions-list.html"
          }
        ]
      }
    ]
  },

  {
    title: "Visitor visas and travel",
    description:
      "Review visitor visa requirements, travel documents and information for people planning to visit Canada.",
    topics: [
      {
        title: "Visitor visa",
        text:
          "Depending on nationality and circumstances, a traveller may need a visitor visa or an electronic travel authorization to travel to Canada. A visitor visa does not authorize employment.",
        links: [
          {
            label: "Visitor visa information",
            url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/visitor-visa.html"
          }
        ]
      },
      {
        title: "Travel requirements",
        text:
          "Check entry requirements, travel documents and any applicable conditions before making travel arrangements.",
        links: [
          {
            label: "Visit Canada",
            url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada.html"
          }
        ]
      }
    ]
  },

  {
    title: "Worker rights and workplace safety",
    description:
      "Understand basic workplace protections and where temporary foreign workers can find help.",
    topics: [
      {
        title: "Rights of temporary foreign workers",
        text:
          "Temporary foreign workers in Canada have workplace rights under applicable federal, provincial or territorial laws. Employers must follow the rules that apply to their workers.",
        links: [
          {
            label: "Rights of temporary foreign workers",
            url: "https://www.canada.ca/en/employment-social-development/services/foreign-workers/protected-rights.html"
          }
        ]
      },
      {
        title: "Workplace health and safety",
        text:
          "Employers and workers have responsibilities relating to workplace health and safety. The applicable rules depend on the workplace and jurisdiction.",
        links: [
          {
            label: "Workplace health and safety",
            url: "https://www.canada.ca/en/employment-social-development/services/health-safety.html"
          }
        ]
      },
      {
        title: "Report abuse or exploitation",
        text:
          "Workers who experience abuse, unsafe conditions or exploitation should seek help through the appropriate government services."
      }
    ]
  },

  {
    title: "Government services and benefits",
    description:
      "Explore federal services, public programs and information for people living and working in Canada.",
    topics: [
      {
        title: "Government services",
        text:
          "Find federal services and information about employment, immigration, taxes, health, benefits and other public programs.",
        links: [
          {
            label: "Government of Canada services",
            url: "https://www.canada.ca/en/services.html"
          }
        ]
      },
      {
        title: "Social Insurance Number",
        text:
          "A Social Insurance Number is generally required to work in Canada and access certain government programs and benefits. Review the official requirements.",
        links: [
          {
            label: "Social Insurance Number",
            url: "https://www.canada.ca/en/employment-social-development/services/sin.html"
          }
        ]
      },
      {
        title: "Employment Insurance",
        text:
          "Employment Insurance provides temporary financial assistance to eligible people who meet the program's conditions.",
        links: [
          {
            label: "Employment Insurance",
            url: "https://www.canada.ca/en/services/benefits/ei.html"
          }
        ]
      }
    ]
  }
];

function createOfficialLink(link) {
  const anchor = createElement("a", "information-source-link", link.label);

  anchor.href = link.url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";

  return anchor;
}

function renderInformationCentre() {
  if ($("#canada-information")) return;

  const section = createElement("section", "canada-information");
  section.id = "canada-information";

  const heading = createElement(
    "div",
    "information-heading"
  );

  heading.appendChild(
    createElement("p", "section-kicker", "INFORMATION AND SERVICES")
  );

  heading.appendChild(
    createElement(
      "h2",
      "",
      "Canada jobs, immigration and public services"
    )
  );

  heading.appendChild(
    createElement(
      "p",
      "information-intro",
      "Explore helpful information about working, studying, travelling and living in Canada. Each topic includes links to relevant official Government of Canada resources."
    )
  );

  section.appendChild(heading);

  const grid = createElement("div", "information-grid");

  canadaInformation.forEach((category, index) => {
    const card = createElement("article", "information-card");

    const number = createElement(
      "span",
      "information-number",
      String(index + 1).padStart(2, "0")
    );

    card.appendChild(number);

    card.appendChild(
      createElement("h3", "information-card-title", category.title)
    );

    card.appendChild(
      createElement("p", "information-card-description", category.description)
    );

    category.topics.forEach(topic => {
      const details = createElement("details", "information-topic");
      const summary = createElement("summary", "", topic.title);

      details.appendChild(summary);

      details.appendChild(
        createElement("p", "information-topic-text", topic.text)
      );

      if (Array.isArray(topic.links) && topic.links.length > 0) {
        const links = createElement("div", "information-source-links");

        topic.links.forEach(link => {
          links.appendChild(createOfficialLink(link));
        });

        details.appendChild(links);
      }

      card.appendChild(details);
    });

    grid.appendChild(card);
  });

  section.appendChild(grid);

  const notice = createElement("div", "information-notice");

  notice.appendChild(
    createElement("h3", "", "Important information")
  );

  notice.appendChild(
    createElement(
      "p",
      "",
      "This recruitment portal provides general information for applicants. It is not a Government of Canada or Immigration, Refugees and Citizenship Canada website. Information is summarized for convenience and may change. Always confirm current requirements, application procedures and fees through official government sources."
    )
  );

  notice.appendChild(
    createElement(
      "p",
      "",
      "A job offer, recruitment service or LMIA does not guarantee a work permit, visa or entry into Canada. Only the relevant Canadian authorities can make immigration decisions."
    )
  );

  section.appendChild(notice);

  const jobsSection = $("#jobs");

  if (jobsSection) {
    jobsSection.parentNode.insertBefore(section, jobsSection);
  } else {
    const hero = $(".hero");

    if (hero && hero.parentNode) {
      hero.parentNode.insertBefore(section, hero.nextSibling);
    } else {
      document.body.appendChild(section);
    }
  }

  addInformationNavigationLink();
}

function addInformationNavigationLink() {
  const navigation = $(".main-navigation");

  if (!navigation || navigation.querySelector('[href="#canada-information"]')) {
    return;
  }

  const link = createElement(
    "a",
    "",
    "Canada information"
  );

  link.href = "#canada-information";
  navigation.appendChild(link);
}

/* =========================================
   VACANCY MEDIA
========================================= */

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

/* =========================================
   RENDER VACANCY
========================================= */

function renderJob(job) {
  const card = createElement("article", "job-row-card");

  const media = createElement("div", "job-media");
  const details = createElement("div", "job-details");

  addMedia(
    media,
    job.image_url,
    "image",
    `${job.title || "Job"} image`
  );

  addMedia(
    media,
    job.video_url,
    "video",
    `${job.title || "Job"} video`
  );

  if (media.childElementCount > 0) {
    card.appendChild(media);
  }

  details.appendChild(
    createElement("h3", "job-title", job.title || "Vacancy")
  );

  if (job.location) {
    details.appendChild(
      createElement("p", "job-location", job.location)
    );
  }

  if (job.employment_type) {
    details.appendChild(
      createElement("p", "job-type", job.employment_type)
    );
  }

  if (job.description) {
    details.appendChild(
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

    details.appendChild(requirements);
  }

  const applyButton = createElement(
    "button",
    "job-apply-button",
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

  details.appendChild(applyButton);

  card.appendChild(details);

  return card;
}

/* =========================================
   LOAD VACANCIES
========================================= */

async function loadJobs() {
  const jobsContainer = $("#jobs");
  const jobSelect = $("#jobSelect");

  if (!jobsContainer) return;

  jobsContainer.classList.add("job-list-layout");

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

      if (Array.isArray(jobs)) {
        jobs.forEach(job => {
          const option = createElement(
            "option",
            "",
            job.title || `Vacancy ${job.id}`
          );

          option.value = String(job.id);
          jobSelect.appendChild(option);
        });
      }

      if (
        Array.isArray(jobs) &&
        jobs.some(job => String(job.id) === previousValue)
      ) {
        jobSelect.value = previousValue;
      }
    }

  } catch (error) {
    jobsContainer.replaceChildren(
      createElement("p", "error", error.message)
    );
  }
}

/* =========================================
   LOAD GALLERY PHOTOS
========================================= */

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

/* =========================================
   PAYPAL PAYMENT INSTRUCTIONS
========================================= */

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

/* =========================================
   RELOAD VACANCIES BUTTON
========================================= */

const reloadJobsButton = $("#reloadJobs");

if (reloadJobsButton) {
  reloadJobsButton.addEventListener("click", loadJobs);
}

/* =========================================
   APPLICATION SUBMISSION
========================================= */

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

/* =========================================
   APPLICATION TRACKING
========================================= */

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

/* =========================================
   INITIALIZE WEBSITE
========================================= */

renderInformationCentre();
loadJobs();
loadGalleryPhotos();
