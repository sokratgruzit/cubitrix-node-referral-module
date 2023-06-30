const express = require("express");
const router = express();
const referral_controller = require("../controllers/referrals_controller");

const cookieParser = require("cookie-parser");

router.use(cookieParser());
// router.get("/get_referral_options", referral_controller.get_referral_options);

// router.post(
//   "/bind_referral_to_user",
//   referral_controller.bind_referral_to_user
// );
// router.post(
//   "/get_referrals_by_address",
//   referral_controller.get_referrals_by_address
// );
// router.post(
//   "/get_referrals_by_code",
//   referral_controller.get_referrals_by_code
// );
// router.post(
//   "/assign_refferal_to_user",
//   referral_controller.assign_refferal_to_user
// );
// router.post(
//   "/get_referral_data_of_user",
//   referral_controller.get_referral_data_of_user
// );
// router.post(
//   "/get_referral_code_of_user",
//   referral_controller.get_referral_code_of_user
// );
// router.post(
//   "/get_referral_rebates_history_of_user",
//   referral_controller.get_referral_rebates_history_of_user
// );
// router.post(
//   "/get_referral_code_of_user_dashboard",
//   referral_controller.get_referral_code_of_user_dashboard
// );

// router.post("/admin_setup", referral_controller.admin_setup);

// auto generate referral place
router.post("/register_referral", referral_controller.register_referral);
router.post("/get_referral_data", referral_controller.get_referral_data);

module.exports = router;
