const express = require("express");
const router = express();
const referral_controller = require("../controllers/referrals_controller");

const cookieParser = require("cookie-parser");

router.use(cookieParser());
// router.post("/admin_setup", referral_controller.admin_setup);

// auto generate referral place
router.post("/register_referral", referral_controller.register_referral);
router.post("/get_referral_data", referral_controller.get_referral_data);
router.post("/get_referral_tree", referral_controller.get_referral_tree);
router.post(
  "/get_referral_data_uni",
  referral_controller.get_referral_data_uni
);

router.post("/get_referral_code", referral_controller.get_referral_code);
router.post(
  "/get_referra_uni_transactions",
  referral_controller.get_referra_uni_transactions
);

router.post(
  "/get_referra_binary_transactions",
  referral_controller.get_referra_binary_transactions
);
router.post(
  "/get_reerral_global_data",
  referral_controller.get_reerral_global_data
);

module.exports = router;
