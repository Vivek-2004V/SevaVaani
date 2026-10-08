const API_BASE = "";

export async function createSession(serviceId = "scholarship_application", language = "hi", delay = 0) {
  if (delay > 0) await new Promise(r => setTimeout(r, delay));
  const res = await fetch(`${API_BASE}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ service_id: serviceId, language })
  });
  if (!res.ok) throw new Error("Failed to create session");
  return res.json();
}

export async function getSession(sessionId, delay = 0) {
  if (delay > 0) await new Promise(r => setTimeout(r, delay));
  const res = await fetch(`${API_BASE}/api/session/${sessionId}`);
  if (!res.ok) throw new Error("Failed to fetch session state");
  return res.json();
}

export async function switchLanguage(sessionId, language, delay = 0) {
  if (delay > 0) await new Promise(r => setTimeout(r, delay));
  const res = await fetch(`${API_BASE}/api/session/language`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, language })
  });
  if (!res.ok) throw new Error("Failed to switch language");
  return res.json();
}

export async function sendTurn(sessionId, transcript, inputType = "voice", delay = 0) {
  if (delay > 0) await new Promise(r => setTimeout(r, delay));
  const start = performance.now();
  const res = await fetch(`${API_BASE}/api/assist/turn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      transcript,
      input_type: inputType,
      latency_ms: Math.round(performance.now() - start)
    })
  });
  if (!res.ok) throw new Error("Turn failed");
  return res.json();
}

export async function confirmCandidate(sessionId, fieldName, action = "confirm", delay = 0) {
  if (delay > 0) await new Promise(r => setTimeout(r, delay));
  const res = await fetch(`${API_BASE}/api/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      field_name: fieldName,
      action
    })
  });
  if (!res.ok) throw new Error("Confirmation failed");
  return res.json();
}

export async function submitFallbackText(sessionId, fieldName, typedValue, delay = 0) {
  if (delay > 0) await new Promise(r => setTimeout(r, delay));
  const res = await fetch(`${API_BASE}/api/fallback/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      field: fieldName,
      value: typedValue
    })
  });
  if (!res.ok) throw new Error("Text fallback submission failed");
  return res.json();
}

export async function requestHelp(sessionId, fieldName, reason = "user_request", delay = 0) {
  if (delay > 0) await new Promise(r => setTimeout(r, delay));
  const res = await fetch(`${API_BASE}/api/help/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      field_name: fieldName,
      reason
    })
  });
  if (!res.ok) throw new Error("Help request failed");
  return res.json();
}

export async function submitApplication(sessionId, consent, delay = 0) {
  if (delay > 0) await new Promise(r => setTimeout(r, delay));
  const res = await fetch(`${API_BASE}/api/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, consent })
  });
  if (!res.ok) throw new Error("Application submission failed");
  return res.json();
}

export async function getMetrics() {
  const res = await fetch(`${API_BASE}/api/metrics`);
  if (!res.ok) throw new Error("Failed to fetch metrics");
  return res.json();
}
