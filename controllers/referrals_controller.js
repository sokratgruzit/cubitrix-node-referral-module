const { accounts } = require("@cubitrix/models");
const main_helper = require("../helpers/index");

// get account balance
async function test_function(req, res) {
  try {
    return main_helper.success_response(res, "success");
  } catch (e) {
    console.log(e.message);
    return main_helper.error_response(res, "error");
  }
}

module.exports = {
  test_function,
};
