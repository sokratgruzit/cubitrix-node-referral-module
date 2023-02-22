const { accounts } = require("@cubitrix/models");
const main_helper = require("../helpers/index");

// get account balance
async function test_function(address, account_type_id) {
  try {
    return main_helper.return_data(true, "ko");
    return main_helper.error_message("error");
  } catch (e) {
    console.log(e.message);
    return main_helper.error_message("error");
  }
}

module.exports = {
  test_function,
};
