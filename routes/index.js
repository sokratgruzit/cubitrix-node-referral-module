const express = require("express");
const router = express();
const referral_controller = require("../controllers/referrals_controller");

const cookieParser = require("cookie-parser");

router.use(cookieParser());
router.post("/test", referral_controller.test_function);
module.exports = router;
