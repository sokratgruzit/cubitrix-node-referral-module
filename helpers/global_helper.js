const main_helper = require("../helpers/index");
var Web3 = require("web3");
const { account_meta, options } = require("@cubitrix/models");
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
module.exports = {
  get_option_by_key,
  get_account_by_address,
};
