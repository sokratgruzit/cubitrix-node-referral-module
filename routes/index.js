const express = require("express");
const router = express();
const referral_controller = require("../controllers/referrals_controller");

const { options } = require("@cubitrix/models");

const cookieParser = require("cookie-parser");

router.use(cookieParser());
// router.post("/admin_setup", referral_controller.admin_setup);

// auto generate referral place
router.post("/register_referral", referral_controller.register_referral);
router.post(
  "/check_referral_available",
  referral_controller.check_referral_available
);
router.post("/get_referral_user_by_lvl_and_pos", referral_controller.get_referral_user_by_lvl_and_pos);
router.post("/get_referral_user_by_address", referral_controller.get_referral_user_by_address);
router.post("/get_referral_data", referral_controller.get_referral_data);
router.post("/get_referral_tree", referral_controller.get_referral_tree);
router.post(
  "/get_referral_data_uni",
  referral_controller.get_referral_data_uni
);

router.post("/get_referral_code", referral_controller.get_referral_code);
router.post(
  "/get_referral_uni_transactions",
  referral_controller.get_referral_uni_transactions
);

router.post(
  "/get_referral_binary_transactions",
  referral_controller.get_referral_binary_transactions
);
router.post(
  "/get_referral_global_data",
  referral_controller.get_referral_global_data
);
router.post(
  "/get_referral_parent_address",
  referral_controller.get_referral_parent_address
);
router.post("/uni_comission_count", referral_controller.uni_comission_count);
router.post("/binary_comission_count", referral_controller.binary_comission_count);
router.post("/get_referral_options", referral_controller.get_referral_options);
router.post("/binary_comission_count_user", async (req, res) => {
  let { address } = req.body;
  const currentDate = new Date();
  const currentDayOfMonth = currentDate.getDate();
  const daysPassed = currentDayOfMonth - 1;
  let results;
  let referral_options = await options.findOne({
    key: "referral_binary_bv_options",
  });
  
  let binary_bv_dayes = referral_options?.object_value?.binaryData?.calculated ?? "monthly";
  
  if (binary_bv_dayes == "daily") {
    results = await referral_controller.binary_comission_count_user(1, address);
  } else if (binary_bv_dayes === "monthly") {
    results = await referral_controller.binary_comission_count_user(
      daysPassed,
      address
    );
  } else if (binary_bv_dayes === "weekly") {
    results = await referral_controller.binary_comission_count_user(7, address);
  }
  res.status(200).json({ results });
});
router.post("/uni_comission_count_user", async (req, res) => {
  let { address } = req.body;
  let results;
  let referral_options_uni = await options.findOne({
    key: "referral_uni_options",
  });
  let uni_days = referral_options_uni?.object_value?.uniData?.calculated;

  if (uni_days == "daily") {
    results = await referral_controller.uni_comission_count_user(1, address);
  } else if (uni_days === "monthly") {
    results = await referral_controller.uni_comission_count_user(
      daysPassed,
      address
    );
  } else if (uni_days === "weekly") {
    results = await referral_controller.uni_comission_count_user(7, address);
  }
  res.status(200).json({ results });
});

module.exports = router;
