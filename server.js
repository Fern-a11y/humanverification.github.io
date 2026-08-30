const express = require("express");
const cors = require("cors");

const app = express();

const PORT =
  process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const sites = new Map();

function createKey() {

  return (
    "hv_" +
    Math.random()
      .toString(36)
      .substring(2) +
    Date.now()
  );

}

function getIP(req) {

  const forwarded =
    req.headers["x-forwarded-for"];

  if (forwarded) {
    return forwarded
      .split(",")[0]
      .trim();
  }

  return (
    req.socket.remoteAddress ||
    ""
  );

}

function calculateRisk(data) {

  let score = 0;

  if (!data.userAgent)
    score += 20;

  if (!data.language)
    score += 10;

  if (!data.timezone)
    score += 10;

  if (data.webdriver)
    score += 50;

  if (data.headless)
    score += 30;

  score =
    Math.min(score, 100);

  let status =
    "VERIFIED";

  if (score >= 70) {

    status =
      "BLOCKED";

  } else if (score >= 30) {

    status =
      "CHALLENGE";

  }

  return {
    score,
    status
  };

}

function getBrowser(userAgent) {

  if (/Edg/i.test(userAgent))
    return "Edge";

  if (/Chrome/i.test(userAgent))
    return "Chrome";

  if (/Firefox/i.test(userAgent))
    return "Firefox";

  if (/Safari/i.test(userAgent))
    return "Safari";

  return "Unknown";

}

function getOS(userAgent) {

  if (/Windows/i.test(userAgent))
    return "Windows";

  if (/Mac OS/i.test(userAgent))
    return "macOS";

  if (/Android/i.test(userAgent))
    return "Android";

  if (/iPhone|iPad/i.test(userAgent))
    return "iOS";

  if (/Linux/i.test(userAgent))
    return "Linux";

  return "Unknown";

}

async function getLocation(ip) {

  try {

    const response =
      await fetch(
        "https://ipwho.is/" +
        encodeURIComponent(ip)
      );

    const data =
      await response.json();

    if (!data.success) {
      return {
        country: "Unknown",
        province: "Unknown",
        city: "Unknown"
      };
    }

    return {

      country:
        data.country ||
        "Unknown",

      province:
        data.region ||
        "Unknown",

      city:
        data.city ||
        "Unknown"

    };

  } catch {

    return {
      country: "Unknown",
      province: "Unknown",
      city: "Unknown"
    };

  }

}

async function sendDiscord(
  webhook,
  info
) {

  if (!webhook)
    return;

  const embed = {

    title:
      "🛡️ HumanVerification",

    fields: [

      {
        name: "Website",
        value:
          info.website,
        inline: false
      },

      {
        name: "Status",
        value:
          info.status,
        inline: true
      },

      {
        name: "Risk Score",
        value:
          String(info.risk),
        inline: true
      },

      {
        name: "Browser",
        value:
          info.browser,
        inline: true
      },

      {
        name: "OS",
        value:
          info.os,
        inline: true
      },

      {
        name: "Language",
        value:
          info.language,
        inline: true
      },

      {
        name: "Country",
        value:
          info.country,
        inline: true
      },

      {
        name: "Province",
        value:
          info.province,
        inline: true
      },

      {
        name: "City",
        value:
          info.city,
        inline: true
      }

    ],

    timestamp:
      new Date().toISOString()

  };

  await fetch(
    webhook,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        embeds: [embed]
      })
    }
  );

}

app.get(
  "/",
  (req, res) => {

    res.json({
      name:
        "HumanVerification",
      status:
        "online"
    });

  }
);

app.post(
  "/api/sites",
  (req, res) => {

    const {
      website,
      webhook
    } = req.body;

    if (!website) {

      return res
        .status(400)
        .json({
          success: false,
          error:
            "website_required"
        });

    }

    if (
      webhook &&
      !webhook.startsWith(
        "https://discord.com/api/webhooks/"
      )
    ) {

      return res
        .status(400)
        .json({
          success: false,
          error:
            "invalid_discord_webhook"
        });

    }

    const siteKey =
      createKey();

    sites.set(
      siteKey,
      {
        website,
        webhook
      }
    );

    res.json({

      success: true,

      siteKey

    });

  }
);

app.post(
  "/api/verify",
  async (req, res) => {

    const {
      siteKey,
      userAgent,
      language,
      timezone,
      webdriver,
      headless
    } = req.body;

    const site =
      sites.get(siteKey);

    if (!site) {

      return res
        .status(401)
        .json({
          success: false,
          error:
            "invalid_site"
        });

    }

    const risk =
      calculateRisk({

        userAgent,
        language,
        timezone,
        webdriver,
        headless

      });

    const ip =
      getIP(req);

    const location =
      await getLocation(ip);

    const browser =
      getBrowser(
        userAgent || ""
      );

    const os =
      getOS(
        userAgent || ""
      );

    try {

      await sendDiscord(
        site.webhook,
        {

          website:
            site.website,

          status:
            risk.status,

          risk:
            risk.score,

          browser,

          os,

          language:
            language ||
            "Unknown",

          country:
            location.country,

          province:
            location.province,

          city:
            location.city

        }
      );

    } catch (error) {

      console.error(
        "Discord error:",
        error.message
      );

    }

    res.json({

      success: true,

      status:
        risk.status,

      riskScore:
        risk.score

    });

  }
);

app.listen(
  PORT,
  () => {

    console.log(
      "HumanVerification running on port " +
      PORT
    );

  }
);
