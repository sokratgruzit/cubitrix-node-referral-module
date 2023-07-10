const main_helper = require("../helpers/index");
var Web3 = require("web3");
const { account_meta, options, referral_links } = require("@cubitrix/models");
const { ObjectId } = require("mongodb");
async function get_option_by_key(key) {
  try {
    let option = await options.findOne({ key });
    if (option) {
      return {
        success: true,
        data: option,
      };
    }
    return {
      success: false,
      data: null,
    };
  } catch (e) {
    console.log("get_option_by_key:", e.message);
    return {
      success: false,
      data: null,
    };
  }
}
async function set_object_option_by_key(key, object_value) {
  try {
    let option = await options.findOne({ key });
    if (option) {
      await options.updateOne({ key }, { object_value });
    } else {
      await options.create({ key, object_value });
    }
    return get_option_by_key(key);
  } catch (e) {
    console.log("get_option_by_key:", e.message);
    return "error";
  }
}
// get account type by name
async function get_account_by_address(address) {
  try {
    let account_address = await account_meta
      .findOne({ address: address })
      .exec();

    if (account_address) {
      let type_id = account_address._id;
      return type_id.toString();
    }
    return 0;
  } catch (e) {
    return main_helper.error_message(e.message);
  }
}
// get account type by name
async function get_referral_by_code(referral) {
  try {
    let referral_code = await referral_links
      .findOne({ referral: referral })
      .exec();

    if (referral_code) {
      return referral_code;
    }
    return 0;
  } catch (e) {
    return main_helper.error_message(e.message);
  }
}

function make_hash(length = 66) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}
module.exports = {
  get_option_by_key,
  set_object_option_by_key,
  get_account_by_address,
  get_referral_by_code,
  make_hash,
};
