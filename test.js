const express = require("express");
const mongoose = require("mongoose");
const router = require("./routes/index");
require("dotenv").config();
const app = express();
app.use(express.json({ extended: true }));
app.use("/api/referral", router);

//static path
const root = require("path").join(__dirname, "front", "build");
app.use(express.static(root));

// app.get("*", function (req, res) {
//    res.sendFile(
//       'index.html', { root }
//    );
// });

async function start() {
  const PORT = process.env.PORT || 5000;
  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    app.listen(PORT, () =>
      console.log(`App has been started on port ${PORT}...`)
    );
  } catch (e) {
    console.log(`Server Error ${e.message}`);
    process.exit(1);
  }
}

start();
