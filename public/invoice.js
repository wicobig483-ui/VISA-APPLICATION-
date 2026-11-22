"use strict";
const $ = (selector) => document.querySelector(selector);
const params = new URLSearchParams(location.search);
const reference = params.get("ref") || "";
let currentInvoice = null;

function showMessage(message, isError = false) {
  const el = $("#invoiceMessage");
  el.textContent = message;
  el.classList.toggle("error", isError);
}

function money(value) {
  return Number(value).toFixed(2) + " USDT";
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

async function loadInvoice() {
  if (!reference) {
    showMessage("Invoice reference is missing. Please use the link provided by the administrator.", true);
    return;
  }
  try {
    const data = await request("/api/invoices/" + encodeURIComponent(reference));
    currentInvoice = data.invoice;
    $("#invoiceReference").textContent = currentInvoice.reference;
    $("#employerName").textContent = currentInvoice.employer_name;
    $("#baseAmount").textContent = money(currentInvoice.base_amount);
    $("#feeAmount").textContent = money(currentInvoice.fee_amount);
    $("#totalAmount").textContent = money(currentInvoice.total_amount);
    $("#walletAddress").textContent = data.walletAddress || "Payment wallet is not configured. Contact the administrator.";
    $("#walletPanel").hidden = !data.walletAddress;
    $("#invoiceDetails").hidden = false;

    if (currentInvoice.status === "paid") {
      $("#transactionForm").hidden = true;
      $("#paymentStatus").textContent = "Payment verified. This invoice is marked paid.";
    } else if (currentInvoice.status === "submitted") {
      $("#transactionForm").hidden = true;
      $("#paymentStatus").textContent = "Transaction hash received. Awaiting administrator verification.";
    } else if (!data.walletAddress) {
      $("#transactionForm").hidden = true;
      $("#paymentStatus").textContent = "Payment instructions are temporarily unavailable. Please contact the administrator.";
    } else {
      showMessage("Invoice loaded. Please review the amount and payment instructions.");
    }
  } catch (error) {
    showMessage(error.message, true);
  }
}

const copyButton = $("#copyWallet");
if (copyButton) {
  copyButton.addEventListener("click", async () => {
    const value = $("#walletAddress").textContent;
    try {
      await navigator.clipboard.writeText(value);
      copyButton.textContent = "Copied";
    } catch {
      $("#paymentStatus").textContent = "Please copy the wallet address manually.";
    }
  });
}

const form = $("#transactionForm");
if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = $("#submitTransaction");
    const transactionHash = new FormData(form).get("transactionHash").trim();
    if (!/^[a-fA-F0-9]{64}$/.test(transactionHash)) {
      $("#paymentStatus").textContent = "Enter a valid 64-character TRON transaction hash.";
      return;
    }
    button.disabled = true;
    try {
      const result = await request("/api/invoices/" + encodeURIComponent(reference) + "/transaction", {
        method: "POST",
        body: JSON.stringify({ transactionHash })
      });
      form.hidden = true;
      $("#paymentStatus").textContent = result.message;
    } catch (error) {
      $("#paymentStatus").textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
}

loadInvoice();
