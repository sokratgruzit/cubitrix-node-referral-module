const {
  referral_uni_users,
  referral_binary_users,
  referral_links,
  accounts,
  transactions,
} = require("@cubitrix/models");
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
    let ref_check_binary = await referral_binary_users.findOne({
      user_id,
    });
    let ref_codes = {
      uni: false,
      binary: false,
    };
    if (ref_check) {
      ref_codes.uni = true;
    }
    if (ref_check_binary) {
      ref_codes.binary = true;
    }
    return ref_codes;
  } catch (e) {
    console.log(e.message);
    return "error";
  }
};
const assign_refferal_to_user = async (req, res) => {
  try {
    let { referral, address } = req.body;
    let user_id = await global_helper.get_account_by_address(address);
    let check_ref = await user_already_have_referral_code(user_id);
    let ref_check_author = await referral_links.findOne({ referral });
    if (ref_check_author.account_id == user_id) {
      return main_helper.error_response(
        res,
        "You cannot activate your own code"
      );
    }
    if (check_ref.uni && check_ref.binary) {
      return main_helper.error_response(
        res,
        "User already activated both referral code"
      );
    }
    let full_referral = await global_helper.get_referral_by_code(referral);
    let referral_id = full_referral._id;
    referral_id = referral_id.toString();
    if (full_referral.referral_type == "uni") {
      if (check_ref.uni) {
        return main_helper.error_response(
          res,
          "User already activated uni level referral code"
        );
      }
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
    }
    if (full_referral.referral_type == "binary") {
      if (check_ref.binary) {
        return main_helper.error_response(
          res,
          "User already activated binary level referral code"
        );
      }
      let level_assignment = await referral_level_assignment(
        1,
        referral,
        user_id,
        referral_id
      );
      return main_helper.success_response(res, level_assignment);
    }
  } catch (e) {
    console.log(e.message);
    return main_helper.error_response(res, "error");
  }
};
const referral_level_assignment = async (
  lvl = 1,
  referral,
  user_id,
  referral_id,
  final_data = []
) => {
  let assign_ref_to_user = await referral_binary_users.create({
    user_id,
    referral_id,
    lvl,
    referral,
  });
  if (assign_ref_to_user && lvl <= 11) {
    final_data.push(assign_ref_to_user);
    let user_parent_ref = await get_parent_referral(referral);
    if (user_parent_ref) {
      return await referral_level_assignment(
        lvl + 1,
        user_parent_ref.referral,
        user_id,
        user_parent_ref._id,
        final_data
      );
    }
  }
  return final_data;
};
const get_parent_referral = async (referral) => {
  try {
    let parent_ref_check = await referral_links.findOne({
      referral: referral,
      referral_type: "binary",
    });

    let parent_ref_get = await referral_binary_users.findOne({
      user_id: parent_ref_check.account_id,
    });
    if (!parent_ref_get) {
      return false;
    }

    let parent_ref_lvl2 = await referral_links.findOne({
      referral: parent_ref_get.referral,
      referral_type: "binary",
    });

    return parent_ref_lvl2;
  } catch (e) {
    return false;
  }
};
const admin_setup = async (req, res) => {
  try {
    let referral_options = req.body;
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
async function get_referral_data_of_user(req, res) {
  try {
    let { address } = req.body;
    let referral_types = [
      "referral_bonus_uni_level",
      "referral_bonus_binary_level_1",
      "referral_bonus_binary_level_2",
      "referral_bonus_binary_level_3",
      "referral_bonus_binary_level_4",
      "referral_bonus_binary_level_5",
      "referral_bonus_binary_level_6",
      "referral_bonus_binary_level_7",
      "referral_bonus_binary_level_8",
      "referral_bonus_binary_level_9",
      "referral_bonus_binary_level_10",
      "referral_bonus_binary_level_11",
    ];
    let total_referral_rebates_total = await transactions.aggregate([
      {
        $match: {
          to: address,
          tx_type: {
            $in: referral_types,
          },
        },
      },
      {
        $lookup: {
          from: "account_metas",
          localField: "from",
          foreignField: "address",
          as: "from",
        },
      },
      {
        $unwind: "$from",
      },
      {
        $group: {
          _id: "$tx_type",
          amount: { $sum: "$amount" },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);
    let total_referral_rebates_weekly = await transactions.aggregate([
      {
        $match: {
          to: address,
          tx_type: {
            $in: referral_types,
          },
          createdAt: {
            $gte: new Date(new Date() - 7 * 60 * 60 * 24 * 1000),
          },
        },
      },
      {
        $lookup: {
          from: "account_metas",
          localField: "from",
          foreignField: "address",
          as: "from",
        },
      },
      {
        $unwind: "$from",
      },
      {
        $group: {
          _id: "$tx_type",
          amount: { $sum: "$amount" },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    return main_helper.success_response(res, {
      total_referral_rebates_weekly,
      total_referral_rebates_total,
    });
  } catch (e) {
    return main_helper.error_response(res, e.message);
  }
}
async function get_referral_code_of_user(req, res) {
  try {
    let { address, limit, page } = req.body;
    let referral_types = [
      "referral_bonus_uni_level",
      "referral_bonus_binary_level_1",
      "referral_bonus_binary_level_2",
      "referral_bonus_binary_level_3",
      "referral_bonus_binary_level_4",
      "referral_bonus_binary_level_5",
      "referral_bonus_binary_level_6",
      "referral_bonus_binary_level_7",
      "referral_bonus_binary_level_8",
      "referral_bonus_binary_level_9",
      "referral_bonus_binary_level_10",
      "referral_bonus_binary_level_11",
    ];
    let referral_code = await transactions.aggregate([
      {
        $match: {
          to: address,
          tx_type: {
            $in: referral_types,
          },
        },
      },
      {
        $lookup: {
          from: "account_metas",
          localField: "from",
          foreignField: "address",
          as: "from",
        },
      },
      {
        $unwind: "$from",
      },
      {
        $group: {
          _id: {
            from: "$from.address",
            tx_type: "$tx_type",
            referrral: "$tx_options.referral",
            referral_module: "$tx_options.referral_module",
            lvl: "$tx_options.lvl",
            percent: "$tx_options.percent",
          },
          amount: { $sum: "$amount" },
        },
      },
      {
        $skip: limit * (page - 1),
      },
      {
        $limit: limit,
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);
    let total_records = await transactions.aggregate([
      {
        $match: {
          to: address,
          tx_type: {
            $in: referral_types,
          },
        },
      },
      {
        $count: "tx_hash",
      },
    ]);
    let total_pages = 0;
    if (total_records.length > 0) {
      total_pages = total_records[0].tx_hash;
    }
    return main_helper.success_response(res, {
      referral_code,
      total_pages,
    });
  } catch (e) {
    return main_helper.error_response(res, e.message);
  }
}
async function get_referral_rebates_history_of_user(req, res) {
  try {
    let { address, limit, page } = req.body;
    let referral_types = [
      "referral_bonus_uni_level",
      "referral_bonus_binary_level_1",
      "referral_bonus_binary_level_2",
      "referral_bonus_binary_level_3",
      "referral_bonus_binary_level_4",
      "referral_bonus_binary_level_5",
      "referral_bonus_binary_level_6",
      "referral_bonus_binary_level_7",
      "referral_bonus_binary_level_8",
      "referral_bonus_binary_level_9",
      "referral_bonus_binary_level_10",
      "referral_bonus_binary_level_11",
    ];
    let referral_rebates_history = await transactions.aggregate([
      {
        $match: {
          to: address,
          tx_type: {
            $in: referral_types,
          },
        },
      },
      {
        $lookup: {
          from: "account_metas",
          localField: "from",
          foreignField: "address",
          as: "from",
        },
      },
      {
        $unwind: "$from",
      },
      {
        $skip: limit * (page - 1),
      },
      {
        $limit: limit,
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);
    let total_records = await transactions.aggregate([
      {
        $match: {
          to: address,
          tx_type: {
            $in: referral_types,
          },
        },
      },
      {
        $count: "tx_hash",
      },
    ]);
    console.log(total_records);
    let total_pages = 0;
    if (total_records.length > 0) {
      total_pages = total_records[0].tx_hash;
    }
    return main_helper.success_response(res, {
      referral_rebates_history,
      total_pages,
    });
  } catch (e) {
    return main_helper.error_response(res, e.message);
  }
}

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
  get_referral_data_of_user,
  get_referral_code_of_user,
  get_referral_rebates_history_of_user,
};
