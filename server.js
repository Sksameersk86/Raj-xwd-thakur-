const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname));

const upload = multer({ dest: "uploads/" });

app.post("/send", upload.single("npFile"), async (req, res) => {
  const { password, token, uid, haterName, time } = req.body;

  if (password !== "RUDRA") {
    return res.status(401).send("❌ Incorrect Password");
  }

  if (!token || !uid || !haterName || !req.file) {
    return res.status(400).send("❗ Missing required fields");
  }

  const fca = require("fca-unofficial");

  // ✅ FIXED LINE BELOW
  const msgLines = fs.readFileSync(req.file.path, "utf-8").split("\n").filter(Boolean);

  fca({ appState: token.startsWith("[") ? JSON.parse(token) : null, access_token: token }, (err, api) => {
    if (err) return res.send("Facebook Login Failed ❌: " + (err.error || err));

    let count = 0;
    const sendMessage = () => {
      if (count >= msgLines.length) return;
      const msg = msgLines[count].replace(/{name}/gi, haterName);
      api.sendMessage(msg, uid);
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
