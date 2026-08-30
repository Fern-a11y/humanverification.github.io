(function () {

  "use strict";

  const script =
    document.currentScript;

  const url =
    new URL(script.src);

  const site =
    url.searchParams.get("site");

  if (!site) {
    console.error(
      "HumanVerification: missing site."
    );

    return;
  }

  const API =
    url.origin;

  const data = {

    siteKey: site,

    userAgent:
      navigator.userAgent || "",

    language:
      navigator.language || "",

    timezone:
      Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone || "",

    webdriver:
      navigator.webdriver === true,

    headless:
      /HeadlessChrome/i.test(
        navigator.userAgent || ""
      )

  };

  fetch(
    API + "/api/verify",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify(data)
    }
  )
  .then(response =>
    response.json()
  )
  .then(result => {

    window.HumanVerification = {
      status:
        result.status,

      riskScore:
        result.riskScore,

      verified:
        result.status ===
        "VERIFIED"
    };

    window.dispatchEvent(
      new CustomEvent(
        "humanverification",
        {
          detail: result
        }
      )
    );

  })
  .catch(error => {

    console.error(
      "HumanVerification:",
      error
    );

  });

})();
