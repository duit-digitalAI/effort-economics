// SAFE FETCH WRAPPER
async function safeFetch(url) {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch (e) {
    console.log("Fetch error:", e);
    return null;
  }
}

// Usage Counter
safeFetch("https://effort-economics-api.azurewebsites.net/api/usage")
  .then(data => {
    if (data && data.count) {
      document.getElementById("usageCounter").innerText =
        data.count + " people have mapped their effort structure.";
    }
  });

// Share
document.getElementById("shareBtn").addEventListener("click", async () => {
  const url = window.location.origin + "/index.html";
  if (navigator.share) {
    await navigator.share({ title: "Effort Economics", url });
  } else {
    await navigator.clipboard.writeText(url);
    alert("Link copied.");
  }
});

// Feedback
function sendFeedback(vote) {
  fetch("https://effort-economics-api.azurewebsites.net/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vote })
  });
}

document.getElementById("thumbsUp").onclick = () => sendFeedback("up");
document.getElementById("thumbsDown").onclick = () => sendFeedback("down");
