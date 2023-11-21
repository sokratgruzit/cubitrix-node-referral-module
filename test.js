const express = require("express");
const mongoose = require("mongoose");
const router = require("./routes/index");
require("dotenv").config();
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();
app.use(express.json({ extended: true }));
app.use(cookieParser());

const isAuthenticated = require("./middleware/IsAuthenticated");
//const { check_referral_available } = require("./controllers/referrals_controller");

app.use(isAuthenticated);

const cors_options = {
  origin: ["http://localhost:4000", "http://localhost:3000", "http://localhost:6006"],
  optionsSuccessStatus: 200,
  credentials: true,
};

app.use(cors(cors_options));
app.use("/api/referral", router);

const root = require("path").join(__dirname, "front", "build");
app.use(express.static(root));
// app.get("*", function (req, res) {
//    res.sendFile(
//       'index.html', { root }
//    );
// });

//check_referral_available();
// const getdaysBetween = () => {
//   const currentDate = new Date();
//   const currentMonth = currentDate.getMonth() + 1;
//   const currentYear = currentDate.getFullYear();

//   const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
//   const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

//   const firstDayOfPreviousMonth = new Date(previousYear, previousMonth - 1, 1);
//   const firstDayOfCurrentMonth = new Date(currentYear, currentMonth - 1, 1);

//   const daysBetween = Math.round(
//     (firstDayOfCurrentMonth - firstDayOfPreviousMonth) / (1000 * 60 * 60 * 24),
//   );
//   return daysBetween;
// };

// let checkDays = getdaysBetween();
// console.log(checkDays);

async function start() {
  const PORT = process.env.PORT || 4000;
  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    app.listen(PORT, () => console.log(`App has been started on port ${PORT}...`));
  } catch (e) {
    console.log(`Server Error ${e.message}`);
    process.exit(1);
  }
}

start();
