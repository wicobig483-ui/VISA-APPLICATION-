const STORAGE_KEY = "canadaWorkPermitDemoApplications";

function getApplications() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function makeReference() {
  return "CA-WP-" + Math.floor(100000 + Math.random() * 900000);
}

document.getElementById("applicationForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;

  const data = Object.fromEntries(new FormData(form).entries());
  data.documents = new FormData(form).getAll("documents");
  data.reference = makeReference();
  data.status = "Received (demo)";
  data.createdAt = new Date().toISOString();

  const applications = getApplications();
  applications.push(data);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));

  const message = document.getElementById("formMessage");
  message.textContent = `Demo application saved. Your reference number is ${data.reference}. Keep it to check the sample status below.`;
  document.getElementById("reference").value = data.reference;
  form.reset();
  document.getElementById("tracking").scrollIntoView({ behavior: "smooth" });
});

document.getElementById("trackingForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const reference = document.getElementById("reference").value.trim().toUpperCase();
  const match = getApplications().find(app => app.reference === reference);
  const result = document.getElementById("trackingResult");
  if (match) {
    result.textContent = `Status: ${match.status}. Saved on this device as a demonstration record.`;
  } else {
    result.textContent = "No demo application found on this device. Check the reference number and try again.";
  }
});

document.getElementById("trackNav").addEventListener("click", () => {
  document.getElementById("tracking").scrollIntoView({ behavior: "smooth" });
});
