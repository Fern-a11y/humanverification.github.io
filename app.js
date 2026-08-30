function generate() {

  const site =
    document.getElementById("site").value;

  if (!site) {
    alert("Enter your website first.");
    return;
  }

  const key =
    "hv_live_" +
    crypto.randomUUID()
      .replaceAll("-", "");

  const code = `
<script
  src="https://YOUR-API-DOMAIN.com/widget.js"
  data-sitekey="${key}">
<\/script>

<div data-humanverify></div>
`.trim();

  document.getElementById("code")
    .textContent = code;
}
