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

app.use(isAuthenticated);

const cors_options = {
  origin: ["http://localhost:4000", "http://localhost:3000", "http://localhost:6006"],
  optionsSuccessStatus: 200,
  credentials: true,
};

app.use(cors(cors_options));
app.use("/api/referral", router);

// console.log(accounts.index("jinx1"));
// app.use('/accounts', router)

// const auth = require('./modules/auth/routes/index.routes');
// const staking = require('./modules/staking/routes/index.routes');

//load modules depend env file
// if(process.env.AUTH === 'true') app.use('/api/auth', auth);
// if(process.env.STAKING === 'true') app.use('/api/staking', staking);

// //test route
// app.get("/test", (req, res) => {
//    res.send("server is working");
// });

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
    app.listen(PORT, () => console.log(`App has been started on port ${PORT}...`));
  } catch (e) {
    console.log(`Server Error ${e.message}`);
    process.exit(1);
  }
}

start();
