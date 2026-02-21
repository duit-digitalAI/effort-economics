// SHARE
document.getElementById("shareBtn").addEventListener("click", async () => {
  const url = window.location.origin + "/index.html?ref=share";
  const text = "See where your effort compounds using Effort Economics.";

  if (navigator.share) {
    await navigator.share({ title: "Effort Economics", text, url });
  } else {
    await navigator.clipboard.writeText(url);
    alert("Link copied to clipboard.");
  }
});

// FEEDBACK
function sendFeedback(vote) {
  fetch("https://effort-economics-api.azurewebsites.net/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vote })
  });
}

document.getElementById("thumbsUp").onclick = () => sendFeedback("up");
document.getElementById("thumbsDown").onclick = () => sendFeedback("down");

// USAGE COUNTER
fetch("https://effort-economics-api.azurewebsites.net/api/usage")
  .then(res => res.json())
  .then(data => {
    document.getElementById("usageCounter").innerText =
      data.count + " people have mapped their effort structure.";
  });
