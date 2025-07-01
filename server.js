const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 10000;

const fca = require("fca-smart-shankar");
const OWNER_UID = "61550558518720"; // <-- ये है तेरा OWNER UID

const upload = multer({ dest: "uploads/" });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname));

let threadMemory = {}; // हर ग्रुप का ON/OFF स्टेटस याद रखने के लिए

app.post("/send", upload.single("npFile"), async (req, res) => {
  const { password, token, uid, haterName, time } = req.body;

  if (password !== "RUDRA") return res.status(401).send("❌ Incorrect Password");

  if (!token || !uid || !haterName || !req.file)
    return res.status(400).send("❗ Missing required fields");

  const msgLines = fs.readFileSync(req.file.path, "utf-8").split("\n").filter(Boolean);

  fca({ appState: token.startsWith("[") ? JSON.parse(token) : null, access_token: token }, async (err, api) => {
    if (err) return res.send("Facebook Login Failed ❌: " + (err.error || err));

    api.listenMqtt(async (err, event) => {
      if (err || !event || !event.body) return;

      const threadID = event.threadID;
      const senderID = event.senderID;
      const body = event.body.toLowerCase();

      if (senderID === OWNER_UID) {
        if (body === "+stop") {
          threadMemory[threadID] = false;
          api.sendMessage("🛑 Rudra convo *stopped* in this group.", threadID);
        }
        if (body === "+start") {
          threadMemory[threadID] = true;
          api.sendMessage("✅ Rudra convo *started* in this group.", threadID);
        }
        if (body === "+status") {
          const status = threadMemory[threadID] ? "🟢 ON" : "🔴 OFF";
          api.sendMessage(`📊 Status: ${status}`, threadID);
        }
      }

      // Only run convo if ON
      if (!threadMemory[threadID]) return;
    });

    // Run once to start message delivery
    let count = 0;
    const sendMessage = () => {
      if (count >= msgLines.length) return;
      const msg = msgLines[count].replace(/{name}/gi, haterName);

      api.sendMessage(msg, uid, (err) => {
        if (err) {
          console.log(`❌ Failed: ${msg} → ${uid}`, err);
        } else {
          console.log(`✅ Sent: ${msg} → ${uid}`);
        }
      });

      count++;
      setTimeout(sendMessage, Number(time) * 1000);
    };

    sendMessage();
    res.send("✅ Messages sending started to UID: " + uid);
  });
});

app.listen(PORT, () => {
  console.log("✅ RUDRA MULTI CONVO Server Running on PORT", PORT);
});
