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
const ref_service = require("../services/referral");
const _ = require("lodash");

// auto generate referral place
// auto generate referrral place by side(left right)
// place referral
// place referral unilevel
// bind referral unilevel in above mentioned methods
// calculate daily referral bonus binary by stake amount to all lvls
// calculate daily referral bonus unilevel by stake amount to all lvl

const register_referral = async (req, res) => {
  try {
    let { referral_address, user_address, side } = req.body;
    referral_address = referral_address.toLowerCase();
    user_address = user_address.toLowerCase();
    let checkAddress = referral_address.split("_");
    let user_main_addr = await accounts.findOne({
      account_owner: user_address,
      account_category: "main",
    });
    if (!user_main_addr) {
      return main_helper.error_response(
        res,
        "Sorry , your address isnot recognised"
      );
    }
    if (checkAddress.length < 1) {
      return main_helper.error_response(res, "referral code not provided");
    }
    let account = await accounts.findOne({
      account_owner: checkAddress[0],
      account_category: "main",
    });
    if (!account) {
      return main_helper.error_response(res, "referral code incorrect");
    }
    if (referral_address == user_main_addr.address) {
      return main_helper.error_response(res, "incorrect address");
    }
    let user_already_have_referral_code = await referral_binary_users.findOne({
      user_address: user_main_addr.address,
    });
    let user_already_have_referral_code_uni = await referral_uni_users.findOne({
      user_address: user_main_addr.address,
    });
    let auto_place, auto_place_uni;
    if (!user_already_have_referral_code) {
      auto_place = await ref_service.calculate_referral_best_place(
        referral_address,
        user_main_addr.address,
        side
      );
    }
    if (!user_already_have_referral_code_uni && auto_place) {
      auto_place_uni = await ref_service.calculate_referral_best_place_uni(
        referral_address,
        user_main_addr.address,
        1,
        []
      );
    }

    return main_helper.success_response(res, { auto_place, auto_place_uni });
  } catch (e) {
    console.log(e.message);
    return main_helper.error_response(res, "error");
  }
};

const get_referral_data = async (req, res) => {
  try {
    let response = {};
    let { address, page, limit } = req.body;
    let user_binary = await referral_binary_users.aggregate([
      {
        $match: {
          referral_address: address,
        },
      },
      {
        $lookup: {
          from: "accounts",
          localField: "user_address",
          foreignField: "address",
          as: "joinedAccounts",
        },
      },
      {
        $lookup: {
          from: "account_metas", // Name of the "account_metas" collection
          localField: "joinedAccounts.0.account_owner", // Field in "joinedAccounts" array
          foreignField: "address", // Field in "account_metas" collection
          as: "joinedAccountMetas", // Field name for the joined documents
        },
      },
      {
        $sort: {
          lvl: 1,
          position: 1,
        },
      },
      {
        $limit: limit,
      },
      {
        $skip: (page - 1) * limit,
      },
    ]);

    response.list = user_binary;
    let total_page = await referral_binary_users.count();
    response.total_page = Math.ceil(total_page / limit);
    response.page = page;
    response.limit = limit;
    return main_helper.success_response(res, response);
  } catch (e) {
    console.log(e.message);
    return main_helper.error_response(res, "error");
  }
};

const get_referral_parent_address = async (req, res) => {
  try {
    let { address } = req.body;
    let parent_ref = await referral_binary_users.findOne({
      user_address: address,
      lvl: 1,
    });
    return main_helper.success_response(res, parent_ref.referral_address);
  } catch (e) {
    console.log(e.message);
    return main_helper.error_response(res, "error");
  }
};

const get_referral_data_uni = async (req, res) => {
  try {
    let response = {};
    let { address, page, limit } = req.body;
    let user_uni = await referral_uni_users.aggregate([
      {
        $match: {
          referral_address: address,
        },
      },
      {
        $lookup: {
          from: "accounts",
          localField: "user_address",
          foreignField: "address",
          as: "joinedAccounts",
        },
      },
      {
        $lookup: {
          from: "account_metas", // Name of the "account_metas" collection
          localField: "joinedAccounts.0.account_owner", // Field in "joinedAccounts" array
          foreignField: "address", // Field in "account_metas" collection
          as: "joinedAccountMetas", // Field name for the joined documents
        },
      },
      {
        $lookup: {
          from: "transactions",
          let: { userAddress: "$user_address" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$from", "$$userAddress"] },
                    { $eq: ["$tx_type", "bonus"] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                totalAmount: { $sum: "$amount" },
              },
            },
            {
              $project: {
                _id: 0,
                totalAmount: 1,
              },
            },
          ],
          as: "joinedTransactions",
        },
      },
      {
        $sort: {
          lvl: 1,
          position: 1,
        },
      },
      {
        $limit: limit,
      },
      {
        $skip: (page - 1) * limit,
      },
    ]);

    response.list = user_uni;
    let total_page = await referral_uni_users.count({
      referral_address: address,
    });
    response.total_page = Math.ceil(total_page / limit);
    response.page = page;
    response.limit = limit;
    return main_helper.success_response(res, response);
  } catch (e) {
    console.log(e.message);
    return main_helper.error_response(res, "error");
  }
};

const get_referral_tree = async (req, res) => {
  try {
    let { address, second_address } = req.body;
    let lvl = 1;
    let minLevel = lvl;
    let maxLevel = lvl + 3;

    if (!second_address) {
      second_address = address;
    }

    if (second_address != address) {
      let checkAddress = await referral_binary_users.findOne({
        referral_address: address,
        user_address: second_address,
      });
      let max_level_for_new_tree = 8 - checkAddress.lvl;
      if (max_level_for_new_tree < maxLevel) {
        maxLevel = max_level_for_new_tree;
      }
    }

    let check_referral_for_users = await referral_binary_users.aggregate([
      {
        $match: {
          referral_address: second_address,
          lvl: { $gte: minLevel, $lt: maxLevel },
        },
      },
      {
        $lookup: {
          from: "accounts", // Name of the "accounts" collection
          localField: "user_address", // Field in "referral_binary_users" collection
          foreignField: "address", // Field in "accounts" collection
          as: "joinedAccounts", // Field name for the joined documents
        },
      },
      {
        $lookup: {
          from: "account_metas", // Name of the "account_metas" collection
          localField: "joinedAccounts.0.account_owner", // Field in "joinedAccounts" array
          foreignField: "address", // Field in "account_metas" collection
          as: "joinedAccountMetas", // Field name for the joined documents
        },
      },
      {
        $group: {
          _id: "$lvl",
          documents: {
            $push: {
              $mergeObjects: ["$$ROOT"],
            },
          },
        },
      },
    ]);

    check_referral_for_users.sort((a, b) => {
      return a._id - b._id;
    });
    let missing_positions = [];
    let no_position_child = [];
    let final_result = [];
    for (let i = 1; i < check_referral_for_users.length; i++) {
      let one_ref = check_referral_for_users[i];
      let max_pow_on_this_row = Math.pow(2, one_ref._id);
      if (one_ref.documents.length < max_pow_on_this_row) {
        for (let k = 1; k <= max_pow_on_this_row; k++) {
          if (!_.find(one_ref.documents, { position: k })) {
            missing_positions.push({
              lvl: one_ref._id,
              position: k,
            });
            no_position_child.push({
              lvl: one_ref._id + 1,
              position: k * 2 - 1,
            });
            no_position_child.push({
              lvl: one_ref._id + 1,
              position: k * 2,
            });
          }
        }
      }
    }
    for (let i = 0; i < check_referral_for_users.length; i++) {
      let one_ref = check_referral_for_users[i];
      let max_pow_on_this_row = Math.pow(2, one_ref._id);
      let this_row = [];
      for (let k = 1; k <= max_pow_on_this_row; k++) {
        let index = _.findIndex(one_ref.documents, { position: k });
        if (index < 0) {
          if (_.find(no_position_child, { lvl: one_ref._id, position: k })) {
            this_row.push({ lvl: one_ref._id, position: k, type: "nothing" });
          } else if (
            _.find(missing_positions, { lvl: one_ref._id, position: k })
          ) {
            this_row.push({ lvl: one_ref._id, position: k, type: "missing" });
          }
        } else {
          this_row.push(one_ref.documents[index]);
        }
      }
      final_result.push({
        lvl: one_ref._id,
        documents: this_row,
      });
    }
    if (check_referral_for_users.length < maxLevel) {
      for (
        let i = check_referral_for_users.length;
        i < check_referral_for_users.length + 1;
        i++
      ) {
        let lvlhere = i + 1;
        let maxpow = Math.pow(2, lvlhere);
        let documtnstInner = [];
        for (let k = 0; k < maxpow; k++) {
          let lastlvlitem = _.find(final_result, { lvl: lvlhere - 1 });
          if (lastlvlitem) {
            let itemonefind = _.find(lastlvlitem.documents, {
              type: "missing",
              position: Math.ceil((k + 1) / 2),
            });
            if (!itemonefind) {
              documtnstInner.push({
                lvl: lvlhere,
                position: k + 1,
                type: "missing",
              });
            } else {
              documtnstInner.push({
                lvl: lvlhere,
                position: k + 1,
                type: "nothing",
              });
            }
          } else {
            documtnstInner.push({
              lvl: lvlhere,
              position: k + 1,
              type: "missing",
            });
          }
        }
        final_result.push({
          lvl: lvlhere,
          documents: documtnstInner,
        });
      }
    }

    return main_helper.success_response(res, {
      final_result,
    });
  } catch (e) {
    console.log(e.message);
    return main_helper.error_response(res, "error getting referral tree");
  }
};

const get_referral_code = async (req, res) => {
  try {
    let { address, lvl, position } = req.body;
    if (!address && !lvl && !position) {
      return main_helper.error_message(res, "please provide all position");
    }
    let encrypted = ref_service.encrypt(address, lvl, position);
    return main_helper.success_response(res, encrypted);
  } catch (e) {
    console.log(e.message);
    return main_helper.error_response(res, "error");
  }
};

const get_referra_uni_transactions = async (req, res) => {
  try {
    let { address, limit, page } = req.body;
    let transaction = await transactions
      .find({ to: address, tx_type: "bonus", "tx_options.type": "uni" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);
    let tx_count = await transactions.count({
      to: address,
      tx_type: "bonus",
      "tx_options.type": "uni",
    });
    return main_helper.success_response(res, { transaction, tx_count });
  } catch (e) {
    console.log(e.message);
    return main_helper.error_response(res, "error");
  }
};

const get_referra_binary_transactions = async (req, res) => {
  try {
    let { address, limit, page } = req.body;
    let transaction = await transactions
      .find({ to: address, tx_type: "bonus", "tx_options.type": "binary bv" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);
    let tx_count = await transactions.count({
      to: address,
      tx_type: "bonus",
      "tx_options.type": "binary bv",
    });
    return main_helper.success_response(res, { transaction, tx_count });
  } catch (e) {
    console.log(e.message);
    return main_helper.error_response(res, "error");
  }
};

const get_reerral_global_data = async (req, res) => {
  try {
    let { address, limit, page } = req.body;
    let uni_users = await referral_uni_users.count({
      referral_address: address,
    });
    let binary_users = await referral_binary_users.count({
      referral_address: address,
    });
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    let uni_comission_this_month = await transactions.aggregate([
      {
        $match: {
          to: address,
          tx_type: "bonus",
          "tx_options.type": "uni",
          createdAt: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);
    let uni_comission_total = await transactions.aggregate([
      {
        $match: {
          to: address,
          tx_type: "bonus",
          "tx_options.type": "uni",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);
    let binary_comission_this_month = await transactions.aggregate([
      {
        $match: {
          to: address,
          tx_type: "bonus",
          "tx_options.type": "binary bv",
          createdAt: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);
    let binary_comission_total = await transactions.aggregate([
      {
        $match: {
          to: address,
          tx_type: "bonus",
          "tx_options.type": "binary bv",
          createdAt: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);
    // {
    //   uni_users,
    //   binary_users,
    //   referral_code,
    //   comission this months uni
    //   comission total uni ,
    //   comission both binary;

    // }
    return main_helper.success_response(res, {
      uni_users,
      binary_users,
      uni_comission_this_month,
      binary_comission_this_month,
      uni_comission_total,
      binary_comission_total,
    });
  } catch (e) {
    console.log(e.message);
    return main_helper.error_response(res, "error");
  }
};

const get_referral_address = async (req, res) => {
  try {
    let { address } = req.body;
    let account = await accounts.findOne({
      account_owner: address,
      account_category: "main",
    });
    return main_helper.success_response(res, account?.address);
  } catch (e) {
    console.log(e.message);
    return main_helper.error_response(res, "error");
  }
};

// const admin_setup = async (req, res) => {
//   try {
//     let referral_options = req.body;
//     let update = await global_helper.set_object_option_by_key(
//       "referral_options",
//       referral_options
//     );
//     return main_helper.success_response(res, update);
//   } catch (e) {
//     console.log(e.message);
//     return main_helper.error_response(res, "error");
//   }
// };

// async function get_referral_code_of_user_dashboard(req, res) {
//   try {
//     let { address } = req.body;
//     address = address.toLowerCase();
//     let system_address_referral_txs = await accounts.findOne({
//       $or: [{ account_owner: address }, { address }],
//       account_category: "system",
//     });

//     let referral_types = [
//       "referral_bonus_binary_level_1",
//       "referral_bonus_binary_level_2",
//       "referral_bonus_binary_level_3",
//       "referral_bonus_binary_level_4",
//       "referral_bonus_binary_level_5",
//       "referral_bonus_binary_level_6",
//       "referral_bonus_binary_level_7",
//       "referral_bonus_binary_level_8",
//       "referral_bonus_binary_level_9",
//       "referral_bonus_binary_level_10",
//       "referral_bonus_binary_level_11",
//     ];

//     let referral_sum_binary = await transactions.aggregate([
//       {
//         $match: {
//           to: system_address_referral_txs?.address,
//           tx_type: {
//             $in: referral_types,
//           },
//         },
//       },
//       {
//         $group: {
//           _id: {
//             referrral: "$tx_options.referral",
//             referral_module: "$tx_options.referral_module",
//           },
//           amount: { $sum: "$amount" },
//         },
//       },
//       {
//         $sort: { createdAt: -1 },
//       },
//     ]);
//     let referral_sum_uni = await transactions.aggregate([
//       {
//         $match: {
//           to: system_address_referral_txs?.address,
//           tx_type: "referral_bonus_uni_level",
//         },
//       },
//       {
//         $group: {
//           _id: {
//             referrral: "$tx_options.referral",
//             referral_module: "$tx_options.referral_module",
//           },
//           amount: { $sum: "$amount" },
//         },
//       },
//       {
//         $sort: { createdAt: -1 },
//       },
//     ]);

//     address = address.toLowerCase();

//     let referral_codes_count = await get_referral_by_address(address);

//     let referral_uni_code, referral_binary_code;

//     for (let i = 0; i < referral_codes_count.length; i++) {
//       if (referral_codes_count[i].referral_type == "uni") {
//         referral_uni_code = referral_codes_count[i].referral;
//       } else {
//         referral_binary_code = referral_codes_count[i].referral;
//       }
//     }

//     let referral_count_binary = await referral_binary_users.count({
//       referral: referral_binary_code,
//     });

//     let referral_count_uni = await referral_uni_users.count({
//       referral: referral_uni_code,
//     });

//     return main_helper.success_response(res, {
//       referral_sum_binary,
//       referral_sum_uni,
//       referral_count_binary,
//       referral_count_uni,
//     });
//   } catch (e) {
//     return main_helper.error_response(res, e.message);
//   }
// }
// async function get_referral_rebates_history_of_user(req, res) {
//   try {
//     let { address, limit, page } = req.body;
//     if (address) address = address.toLowerCase();
//     let system_address_referral_txs = await accounts.findOne({
//       $or: [{ account_owner: address }, { address }],
//       account_category: "system",
//     });

//     let referral_types = [
//       "referral_bonus_uni_level",
//       "referral_bonus_binary_level_1",
//       "referral_bonus_binary_level_2",
//       "referral_bonus_binary_level_3",
//       "referral_bonus_binary_level_4",
//       "referral_bonus_binary_level_5",
//       "referral_bonus_binary_level_6",
//       "referral_bonus_binary_level_7",
//       "referral_bonus_binary_level_8",
//       "referral_bonus_binary_level_9",
//       "referral_bonus_binary_level_10",
//       "referral_bonus_binary_level_11",
//     ];
//     let referral_rebates_history = await transactions.aggregate([
//       {
//         $match: {
//           to: system_address_referral_txs?.address,
//           tx_type: {
//             $in: referral_types,
//           },
//         },
//       },
//       {
//         $lookup: {
//           from: "account_metas",
//           localField: "from",
//           foreignField: "address",
//           as: "from",
//         },
//       },
//       {
//         $unwind: "$from",
//       },
//       {
//         $skip: limit * (page - 1),
//       },
//       {
//         $limit: limit,
//       },
//       {
//         $sort: { createdAt: -1 },
//       },
//     ]);
//     let total_records = await transactions.aggregate([
//       {
//         $match: {
//           to: system_address_referral_txs?.address,
//           tx_type: {
//             $in: referral_types,
//           },
//         },
//       },
//       {
//         $count: "tx_hash",
//       },
//     ]);
//     let total_pages = 0;
//     if (total_records.length > 0) {
//       total_pages = total_records[0].tx_hash;
//     }
//     return main_helper.success_response(res, {
//       referral_rebates_history,
//       total_pages,
//     });
//   } catch (e) {
//     return main_helper.error_response(res, e.message);
//   }
// }

// const get_referral_options = async (req, res) => {
//   try {
//     let get_referral_options = await global_helper.get_option_by_key(
//       "referral_options"
//     );
//     if (get_referral_options.success) {
//       return main_helper.success_response(
//         res,
//         get_referral_options?.data?.object_value
//       );
//     } else {
//       return main_helper.success_response(res, {});
//     }
//   } catch (e) {
//     console.log(e.message);
//     main_helper.error_response(res, "error");
//   }
// };

module.exports = {
  register_referral,
  get_referral_data,
  get_referral_tree,
  get_referral_data_uni,
  get_referral_code,
  get_referra_uni_transactions,
  get_referra_binary_transactions,
  get_reerral_global_data,
  get_referral_address,
  get_referral_parent_address,
};
