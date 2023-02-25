const { referral_uni_users, referral_links } = require("@cubitrix/models");
const main_helper = require("../helpers/index");
const global_helper = require("../helpers/global_helper");
const shortid = require("shortid");

// get account balance
async function test_function(req, res) {
  try {
    let {
      type,
      address,
      referral,
      referral_avtivated,
      referral_uni_percentage,
      referral_binary_lvl1_percentage,
      referral_binary_lvl2_percentage,
    } = req.body;
    let return_data;
    if (type == "generate_referral_code") {
      return_data = {
        uni: await generate_referral_code(),
        binary: await generate_referral_code(),
      };
    } else if (type == "bind_referral_to_user") {
      let referral_codes = {
        uni: await generate_referral_code(),
        binary: await generate_referral_code(),
      };
      return_data = await bind_referral_to_user(address, referral_codes);
    } else if (type == "get_referral_by_code") {
      return_data = await get_referral_by_code(referral);
    } else if (type == "get_referral_by_address") {
      return_data = await get_referral_by_address(address);
    } else if (type == "assign_refferal_to_user") {
      return_data = await assign_refferal_to_user(referral, address);
    } else if (type == "admin_setup") {
      return_data = await admin_setup(
        referral_avtivated,
        referral_uni_percentage,
        referral_binary_lvl1_percentage,
        referral_binary_lvl2_percentage
      );
    } else if (type == "get_referral_options") {
      return_data = await get_referral_options();
    }
    return main_helper.success_response(res, return_data);
  } catch (e) {
    console.log(e.message);
    return main_helper.error_response(res, "error");
  }
}
const generate_referral_code = async () => {
  // Generate a short, unique ID with the prefix "REF_"
  let ref_code = "REF_" + shortid.generate() + shortid.generate();
  let checking = await get_referral_by_code(ref_code);
  if (checking.length > 0) {
    return await generate_referral_code();
  }
  return ref_code;
};
const bind_referral_to_user = async (address, referrals) => {
  try {
    let check_by_address = await get_referral_by_address(address);
    if (check_by_address.length > 0) {
      return "referrals on this address already exists";
    }
    for (let i = 0; i < referrals.length; i++) {
      let check_by_code_uni = await get_referral_by_code(referrals[i].uni);
      if (check_by_code_uni.length > 0) {
        return "referral uni code already used";
      }
      let check_by_code_binary = await get_referral_by_code(
        referrals[i].binary
      );
      if (check_by_code_binary.length > 0) {
        return "referral binary code already used";
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
      return referral_links_in_db;
    } else {
      return "error saving referral code to user";
    }
  } catch (e) {
    console.log(e.message);
    return e.message;
  }
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
const assign_refferal_to_user = async (referral, address) => {
  try {
    let user_id = await global_helper.get_account_by_address(address);
    let check_ref = await user_already_have_referral_code(user_id);
    if (check_ref) {
      return "User already activated referral code";
    }
    let referral_id = await global_helper.get_referral_by_code(referral);
    let assign_ref_to_user = await referral_uni_users.create({
      user_id,
      referral_id,
      referral,
    });
    if (assign_ref_to_user) {
      return assign_ref_to_user;
    } else {
      return "error";
    }
  } catch (e) {
    console.log(e.message);
    return e.message;
  }
};
const admin_setup = async (
  referral_avtivated,
  referral_uni_percentage,
  referral_binary_lvl1_percentage,
  referral_binary_lvl2_percentage
) => {
  try {
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
    return update;
  } catch (e) {
    console.log(e.message);
    return;
  }
};
const get_referral_options = async () => {
  try {
    let get_referral_options = await global_helper.get_option_by_key(
      "referral_options"
    );
    if (get_referral_options.success) {
      return get_referral_options?.data?.object_value;
    } else {
      return {};
    }
  } catch (e) {
    console.log(e.message);
    return;
  }
};
module.exports = {
  test_function,
};
