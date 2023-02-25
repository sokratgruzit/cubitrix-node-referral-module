const { referral_uni_users, referral_links } = require("@cubitrix/models");
const main_helper = require("../helpers/index");
const global_helper = require("../helpers/global_helper");
const shortid = require("shortid");

const generate_referral_code = async () => {
  // Generate a short, unique ID with the prefix "REF_"
  let ref_code = "REF_" + shortid.generate() + shortid.generate();
  let checking = await get_referral_by_code(ref_code);
  if (checking.length > 0) {
    return await generate_referral_code();
  }
  return ref_code;
};

const get_referral_by_code = async (referral) => {
  try {
    let code_exists = await referral_links.find({
      referral,
    });
    return code_exists;
  } catch (e) {
    console.log(e.message);
    return false;
  }
};
const get_referral_by_address = async (address) => {
  try {
    let account_id = await global_helper.get_account_by_address(address);
    if (account_id) {
      let creation = await referral_links.find({
        account_id,
      });
      return creation;
    } else {
      return "Address doesnot exist";
    }
  } catch (e) {
    console.log(e.message);
    return e.message;
  }
};
const user_already_have_referral_code = async (user_id) => {
  try {
    let ref_check = await referral_uni_users.findOne({
      user_id,
    });
    if (ref_check) {
      return true;
    } else {
      return false;
    }
  } catch (e) {
    console.log(e.message);
    return false;
  }
};
const assign_refferal_to_user = async (req, res) => {
  try {
    let { referral, address } = req.body;
    let user_id = await global_helper.get_account_by_address(address);
    let check_ref = await user_already_have_referral_code(user_id);
    if (check_ref) {
      return main_helper.error_response(
        res,
        "User already activated referral code"
      );
    }
    let referral_id = await global_helper.get_referral_by_code(referral);
    let assign_ref_to_user = await referral_uni_users.create({
      user_id,
      referral_id,
      referral,
    });
    if (assign_ref_to_user) {
      return main_helper.success_response(res, assign_ref_to_user);
    } else {
      return main_helper.error_response(res, "error");
    }
  } catch (e) {
    console.log(e.message);
    return main_helper.error_response(res, "error");
  }
};
const admin_setup = async (req, res) => {
  try {
    let {
      referral_avtivated,
      referral_uni_percentage,
      referral_binary_lvl1_percentage,
      referral_binary_lvl2_percentage,
    } = req.body;
    let referral_options = {
      referral_avtivated: referral_avtivated,
      referral_uni_percentage: parseFloat(referral_uni_percentage),
      referral_binary_lvl1_percentage: parseFloat(
        referral_binary_lvl1_percentage
      ),
      referral_binary_lvl2_percentage: parseFloat(
        referral_binary_lvl2_percentage
      ),
    };
    let update = await global_helper.set_object_option_by_key(
      "referral_options",
      referral_options
    );
    return main_helper.success_response(res, update);
  } catch (e) {
    console.log(e.message);
    return main_helper.error_response(res, "error");
  }
};
const get_referral_options = async (req, res) => {
  try {
    let get_referral_options = await global_helper.get_option_by_key(
      "referral_options"
    );
    if (get_referral_options.success) {
      return main_helper.success_response(
        res,
        get_referral_options?.data?.object_value
      );
    } else {
      return main_helper.success_response(res, {});
    }
  } catch (e) {
    console.log(e.message);
    main_helper.error_response(res, "error");
  }
};
const generate_referral_codes = async (req, res) => {
  try {
    let return_data = {
      uni: await generate_referral_code(),
      binary: await generate_referral_code(),
    };
    return main_helper.success_response(res, return_data);
  } catch (e) {
    return main_helper.error_response(res, "error");
  }
};

const bind_referral_to_user = async (req, res) => {
  try {
    let { address } = req.body;
    let referrals = {
      uni: await generate_referral_code(),
      binary: await generate_referral_code(),
    };
    let check_by_address = await get_referral_by_address(address);
    if (check_by_address.length > 0) {
      return main_helper.error_response(
        res,
        "referrals on this address already exists or address is invalid"
      );
    }
    for (let i = 0; i < referrals.length; i++) {
      let check_by_code_uni = await get_referral_by_code(referrals[i].uni);
      if (check_by_code_uni.length > 0) {
        return main_helper.error_response(
          res,
          "referral uni code already used"
        );
      }
      let check_by_code_binary = await get_referral_by_code(
        referrals[i].binary
      );
      if (check_by_code_binary.length > 0) {
        return main_helper.error_response(
          res,
          "referral binary code already used"
        );
      }
    }

    let account_id = await global_helper.get_account_by_address(address);
    if (account_id) {
      for (var k in referrals) {
        await referral_links.create({
          account_id,
          referral: referrals[k],
          referral_type: k,
        });
      }
      let referral_links_in_db = await referral_links.find({ account_id });
      return main_helper.success_response(res, referral_links_in_db);
    } else {
      return main_helper.error_response(
        res,
        "error saving referral code to user"
      );
    }
  } catch (e) {
    console.log(e.message);
    return main_helper.error_response(res, e.message);
  }
};

const get_referrals_by_address = async (req, res) => {
  try {
    let { address } = req.body;
    let return_data;
    return_data = await get_referral_by_address(address);

    return main_helper.success_response(res, return_data);
  } catch (e) {
    console.log(e.message);
    return main_helper.error_response(res, "error");
  }
};
const get_referrals_by_code = async (req, res) => {
  try {
    let { referral } = req.body;
    let return_data;
    return_data = await get_referral_by_code(referral);

    return main_helper.success_response(res, return_data);
  } catch (e) {
    console.log(e.message);
    return main_helper.error_response(res, "error");
  }
};

module.exports = {
  get_referral_options,
  generate_referral_codes,
  bind_referral_to_user,
  get_referrals_by_address,
  get_referrals_by_code,
  assign_refferal_to_user,
  admin_setup,
};
