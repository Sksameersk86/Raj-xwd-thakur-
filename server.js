const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 10000;
const upload = multer({ dest: "uploads/" });

const OWNER_UID = "61550558518720";
let running = false;
let intervalId = null;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname));

app.post("/send", upload.single("npFile"), async (req, res) => {
  const { password, senderUID, control, token, uidList, haterName, time } = req.body;

  if (password !== "16×8=JAAT") {
    return res.status(401).send("❌ Incorrect Password");
  }

  if (senderUID !== OWNER_UID) {
    return res.status(403).send("❌ Only Owner UID can control the convo");
  }

  if (control === "stop") {
    running = false;
    clearInterval(intervalId);
    return res.send("🛑 Messages stopped successfully.");
  }

  if (control === "start") {
    if (!token || !uidList || !haterName || !req.file || !time) {
      return res.status(400).send("❗ Missing required fields");
    }

    const fca = require("fca-smart-shankar");
    const msgLines = fs.readFileSync(req.file.path, "utf-8").split("\n").filter(Boolean);
    const uids = uidList.split(/[\n,]+/).map(x => x.trim()).filter(Boolean);
    const names = haterName.split(/[\n,]+/).map(x => x.trim()).filter(Boolean);

    fca({ appState: token.startsWith("[") ? JSON.parse(token) : null, access_token: token }, (err, api) => {
      if (err) return res.send("Facebook Login Failed ❌: " + (err.error || err));

      let count = 0;
      running = true;

      intervalId = setInterval(() => {
        if (!running) {
          clearInterval(intervalId);
          return;
        }

        if (count >= msgLines.length) {
          count = 0;
        }

        const originalMsg = msgLines[count];
        const randomName = names[Math.floor(Math.random() * names.length)];

        // 🔀 Random placement: start or end
        const msg = Math.random() < 0.5
          ? `${randomName}: ${originalMsg}`
          : `${originalMsg} - ${randomName}`;

        for (let uid of uids) {
          api.sendMessage(msg, uid, (err) => {
            if (err) {
              console.log(`❌ Failed to send to ${uid}:`, err);
            } else {
              console.log(`✅ Sent to ${uid}: ${msg}`);
            }
          });
        }

        count++;
      }, Number(time) * 1000);

      res.send("✅ Messages started looping to all UIDs.");
    });
  } else {
    res.status(400).send("❗ Invalid control option");
  }
});

app.listen(PORT, () => {
  console.log(`✅ RUDRA MULTI CONVO Server running at PORT ${PORT}`);
});
