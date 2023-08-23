const express = require("express");
const mongoose = require("mongoose");
const router = require("./routes/index");
const referral_controller = require("./controllers/referrals_controller");
require("dotenv").config();
const app = express();

const cors = require("cors");

const cors_options = {
  origin: [
    "http://localhost:4000",
    "http://localhost:3000",
    "http://localhost:6006",
  ],
  optionsSuccessStatus: 200,
  credentials: true,
};

app.use(cors(cors_options));
app.use(express.json({ extended: true }));
app.use("/api/referral", router);

app.get("/", function (req, res) {
  res.send("Hello World!");
});

//static path
const root = require("path").join(__dirname, "front", "build");
app.use(express.static(root));

// app.get("*", function (req, res) {
//    res.sendFile(
//       'index.html', { root }
//    );
// });

async function start() {
  const PORT = process.env.PORT || 4000;
  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    // let binary = await referral_controller.binary_comission_count(30);
    // let uni = await referral_controller.uni_comission_count(20);
    // if (binary) {
    //   console.log(binary);
    // }
    // if (uni) {
    //   console.log(uni);
    // }
    app.listen(PORT, () =>
      console.log(`App has been started on port ${PORT}...`)
    );
  } catch (e) {
    console.log(`Server Error ${e.message}`);
    process.exit(1);
  }
}

start();
