// === server.js === const express = require("express"); const multer = require("multer"); const fs = require("fs"); const path = require("path"); const bodyParser = require("body-parser"); const fca = require("fca-smart-shankar");

const app = express(); const PORT = process.env.PORT || 10000;

app.use(bodyParser.urlencoded({ extended: true })); app.use(bodyParser.json()); app.use(express.static(__dirname));

const upload = multer({ dest: "uploads/" });

// Global send control let isSending = false; const OWNER_UID = "61550558518720";

app.post("/send", upload.single("npFile"), async (req, res) => { const { password, token, uidList, haterName, time, control, senderUID } = req.body;

if (password !== "RUDRA") return res.status(401).send("❌ Incorrect Password"); if (senderUID !== OWNER_UID) return res.status(403).send("❌ Only owner can control");

if (control === "stop") { isSending = false; return res.send("🛑 Stopped by Owner"); }

if (control === "start") { if (!token || !uidList || !haterName || !req.file || !time) { return res.status(400).send("❗ Missing required fields"); }

const msgLines = fs.readFileSync(req.file.path, "utf-8").split("\n").filter(Boolean);
const uids = uidList.split(/[,\n]/).map(e => e.trim()).filter(Boolean);

fca({ appState: token.startsWith("[") ? JSON.parse(token) : null, access_token: token }, (err, api) => {
  if (err) return res.send("Facebook Login Failed ❌: " + (err.error || err));
  isSending = true;

  const loop = async () => {
    for (const uid of uids) {
      if (!isSending) return;
      for (let line of msgLines) {
        if (!isSending) return;
        const msg = line.replace(/{name}/gi, haterName);
        api.sendMessage(msg, uid, (err) => {
          if (err) console.log("❌ Failed:", msg, "→", uid);
          else console.log("✅ Sent:", msg, "→", uid);
        });
        await new Promise(r => setTimeout(r, Number(time) * 1000));
      }
    }
  };

  loop();
  res.send("✅ Sending started to all UIDs");
});

} else { return res.send("❓ Unknown control command"); } });

app.listen(PORT, () => { console.log("✅ RUDRA MULTI CONVO Server Running on PORT", PORT); });

