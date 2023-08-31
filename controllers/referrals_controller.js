const {
  referral_uni_users,
  referral_binary_users,
  referral_links,
  accounts,
  transactions,
  options,
  stakes,
} = require("@cubitrix/models");
const main_helper = require("../helpers/index");
const global_helper = require("../helpers/global_helper");
const shortid = require("shortid");
const ref_service = require("../services/referral");
const _ = require("lodash");
const moment = require("moment");
const mongoose = require("mongoose");

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
      return main_helper.error_response(res, "Sorry , your address isnot recognised");
    }
    if (checkAddress.length < 1) {
      return main_helper.error_response(res, "referral code not provided");
    }
    let account = await accounts.findOne({
      address: checkAddress[0],
      account_category: "main",
    });
    if (!account) {
      return main_helper.error_response(res, "referral code incorrect");
    }
    if (
      checkAddress[0] == user_main_addr.address ||
      account?.tier?.value == "Novice Navigator"
    ) {
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
        side,
      );
    }
    if (
      !user_already_have_referral_code_uni &&
      auto_place &&
      auto_place != "code is already used"
    ) {
      if (checkAddress.length > 1) {
        let decrypted = ref_service.decrypt(checkAddress[1]);
        let address = decrypted.split("_");
        auto_place_uni = await ref_service.calculate_referral_best_place_uni(
          address[2],
          user_main_addr.address,
          1,
          [],
        );
      } else {
        auto_place_uni = await ref_service.calculate_referral_best_place_uni(
          checkAddress[0],
          user_main_addr.address,
          1,
          [],
        );
      }
    }

    return main_helper.success_response(res, { auto_place, auto_place_uni });
  } catch (e) {
    console.log(e.message);
    return main_helper.error_response(res, "error");
  }
};
const check_referral_available = async (req, res) => {
  try {
    let { referral_address, user_address } = req.body;
    referral_address = referral_address.toLowerCase();
    user_address = user_address.toLowerCase();
    let checkAddress = referral_address.split("_");
    let user_main_addr = await accounts.findOne({
      account_owner: user_address,
      account_category: "main",
    });
    if (!user_main_addr) {
      return main_helper.error_response(res, "Sorry , your address isnot recognised");
    }
    if (checkAddress.length < 1) {
      return main_helper.error_response(res, "referral code not provided");
    }
    let account = await accounts.findOne({
      address: checkAddress[0],
      account_category: "main",
    });
    if (!account) {
      return main_helper.error_response(res, "referral code incorrect");
    }
    if (
      checkAddress[0] == user_main_addr.address ||
      account?.tier?.value == "Novice Navigator"
    ) {
      return main_helper.error_response(res, "incorrect address");
    }

    if (checkAddress.length > 1) {
      if (checkAddress?.[1]?.length !== 96) {
        return main_helper.error_response(res, {
          message: "incorrect code length",
          statusCode: 0,
        });
      }
      let decr = await ref_service.decrypt(checkAddress[1]);
      console.log(decr, "decr");
      let split_dec = decr.split("_");
      if (split_dec.size < 3) {
        return main_helper.error_response(res, {
          message: "incorrect code",
          statusCode: 0,
        });
      }
      if (isNaN(split_dec[1]) || isNaN(split_dec[2])) {
        return main_helper.error_response(res, {
          message: "incorrect code",
          statusCode: 0,
        });
      }
      let checkreferralbyplace = await referral_binary_users.findOne({
        referral_address: split_dec[2],
        lvl: split_dec[0],
        position: split_dec[1],
      });
      if (checkreferralbyplace) {
        return main_helper.error_response(res, {
          message: "no space",
          statusCode: 0,
          checkreferralbyplace,
        });
      }
    } else {
      let referral_options = await options.findOne({
        key: "referral_binary_bv_options",
      });
      let binary_max_lvl = referral_options?.object_value?.binaryData?.maxUsers
        ? referral_options?.object_value?.binaryData?.maxUsers
        : 11;
      let checkallspaces = await referral_binary_users.count({
        referral_address: checkAddress[0],
        lvl: binary_max_lvl,
      });
      if (checkAddress == Math.pow(2, binary_max_lvl)) {
        return main_helper.error_response(res, {
          message: "no space",
          statusCode: 0,
        });
      }
    }

    return main_helper.success_response(res, { statusCode: 1, message: "ok" });
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
    for (let i = 0; i < user_binary.length; i++) {
      if (user_binary[i]?.joinedAccountMetas[0]?.name) {
        user_binary[i].joinedAccountMetas[0].name = hideName(
          user_binary[i]?.joinedAccountMetas[0]?.name,
        );
        user_binary[i].joinedAccountMetas[0].email = hideName(
          user_binary[i]?.joinedAccountMetas[0]?.email,
        );
      }
    }

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
                    { $eq: ["$to", address] },
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
    for (let i = 0; i < user_uni.length; i++) {
      if (user_uni[i]?.joinedAccountMetas[0]?.name) {
        user_uni[i].joinedAccountMetas[0].name = hideName(
          user_uni[i]?.joinedAccountMetas[0]?.name,
        );
        user_uni[i].joinedAccountMetas[0].email = hideName(
          user_uni[i]?.joinedAccountMetas[0]?.email,
        );
      }
    }
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
    let referral_options = await options.findOne({
      key: "referral_binary_bv_options",
    });
    let binary_max_lvl = referral_options?.object_value?.binaryData?.maxUsers
      ? referral_options?.object_value?.binaryData?.maxUsers
      : 11;
    let binary_max_depth = null;

    if (!second_address) {
      second_address = address;
    }

    if (second_address != address) {
      let checkAddress = await referral_binary_users.findOne({
        referral_address: address,
        user_address: second_address,
      });
      let max_level_for_new_tree = binary_max_lvl - checkAddress.lvl;
      binary_max_depth = checkAddress.lvl;
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
    for (let i = 0; i < check_referral_for_users.length; i++) {
      let documents = check_referral_for_users[i]?.documents;
      for (let k = 0; k < documents.length; k++) {
        if (documents[k]?.joinedAccountMetas[0]?.name) {
          check_referral_for_users[i].documents[k].joinedAccountMetas[0].name = hideName(
            documents[k]?.joinedAccountMetas[0]?.name,
          );
          check_referral_for_users[i].documents[k].joinedAccountMetas[0].email = hideName(
            documents[k]?.joinedAccountMetas[0]?.email,
          );
        }
      }
    }
    let missing_positions = [];
    let no_position_child = [];
    let final_result = [];
    for (let i = 0; i < check_referral_for_users.length; i++) {
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
          } else if (_.find(missing_positions, { lvl: one_ref._id, position: k })) {
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
          let this_position_check = _.find(final_result, {
            lvl: lvlhere,
            position: k + 1,
          });
          if (!this_position_check) {
            let lastlvlitem = _.find(final_result, { lvl: lvlhere - 1 });

            if (lastlvlitem) {
              let itemonefind = _.find(lastlvlitem.documents, {
                type: "missing",
                position: Math.ceil((k + 1) / 2),
              });
              let itemonefindnothing = _.find(lastlvlitem.documents, {
                type: "nothing",
                position: Math.ceil((k + 1) / 2),
              });
              if (itemonefindnothing) {
                documtnstInner.push({
                  lvl: lvlhere,
                  position: k + 1,
                  type: "nothing",
                });
              } else if (!itemonefind) {
                if (binary_max_depth && binary_max_depth + lvlhere == binary_max_lvl) {
                  documtnstInner.push({
                    lvl: lvlhere,
                    position: k + 1,
                    type: "nothing",
                  });
                } else {
                  documtnstInner.push({
                    lvl: lvlhere,
                    position: k + 1,
                    type: "missing",
                  });
                }
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
        }
        if (documtnstInner.length > 0) {
          final_result.push({
            lvl: lvlhere,
            documents: documtnstInner,
          });
        }
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
    let { address, lvl, position, main_address } = req.body;
    if (!address && !lvl && !position && !main_address) {
      return main_helper.error_message(res, "please provide all position");
    }
    let encrypted = ref_service.encrypt(address, lvl, position, main_address);
    return main_helper.success_response(res, encrypted);
  } catch (e) {
    console.log(e.message);
    return main_helper.error_response(res, "error");
  }
};

const get_referral_uni_transactions = async (req, res) => {
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
    let total_page = Math.ceil(tx_count / limit);
    return main_helper.success_response(res, { transaction, total_page });
  } catch (e) {
    console.log(e.message);
    return main_helper.error_response(res, "error");
  }
};

const get_referral_binary_transactions = async (req, res) => {
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
    let total_page = Math.ceil(tx_count / limit);
    return main_helper.success_response(res, { transaction, total_page });
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
const get_referral_options = async (req, res) => {
  try {
    let { name } = req.body;
    let key;
    if (name == "Uni") {
      key = "referral_uni_options";
    } else if (name == "Binary bv") {
      key = "referral_binary_bv_options";
    } else {
      return main_helper.error_response(res, "error");
    }
    let settings = await options.findOne({
      key,
    });
    return main_helper.success_response(res, settings);
  } catch (e) {
    console.log(e.message);
    return main_helper.error_response(res, "error");
  }
};

const cron_test = async () => {
  try {
    console.log("cron works");
    return true;
  } catch (e) {
    console.log(e.message);
    return false;
  }
};

const uni_comission_count = async (interval, address = null) => {
  let referral_options = await options.findOne({
    key: "referral_uni_options",
  });
  let bv = referral_options?.object_value?.binaryData?.lvlOptions;
  // if()
  let comissions = referral_options?.object_value?.uniData?.lvlOptions?.maxCommPercentage;
  let maxCommision = referral_options?.object_value?.uniData?.lvlOptions?.maxCommision;

  let interval_ago = moment().subtract(interval, "days").startOf("day").valueOf();
  interval_ago = interval_ago / 1000;

  // await stakes.updateMany(
  //   {},
  //   {
  //     $set: {
  //       uni_placed: false,
  //     },
  //   }
  // );
  // return true;
  // let todayStartOfDay = moment().startOf("day").valueOf() / 1000;
  // console.log(interval, interval_ago);

  const filteredStakes = await stakes.aggregate([
    {
      $match: {
        staketime: { $gte: interval_ago },
        uni_placed: false,
        // staketime: { $gte: interval_ago , $lt:todayStartOfDay},
      },
    },
    {
      $lookup: {
        from: "accounts",
        localField: "address",
        foreignField: "account_owner",
        as: "joinedAccounts",
      },
    },
    {
      $unwind: "$joinedAccounts",
    },
    {
      $group: {
        _id: "$joinedAccounts.address",
        totalAmount: { $sum: "$amount" },
      },
    },
  ]);

  const filteredStakesIds = await stakes.aggregate([
    {
      $match: {
        staketime: { $gte: interval_ago },
        uni_placed: false,
        // staketime: { $gte: interval_ago , $lt:todayStartOfDay},
      },
    },
  ]);
  // console.log(filteredStakes);

  let addresses_that_staked_this_interval = [];
  if (address) {
    addresses_that_staked_this_interval = [address];
  } else {
    for (let i = 0; i < filteredStakes.length; i++) {
      addresses_that_staked_this_interval.push(filteredStakes[i]._id);
    }
  }

  let comissions_of_addresses = [];
  let stakeIds = [];
  let referral_addresses = await referral_uni_users.find({
    user_address: { $in: addresses_that_staked_this_interval },
  });
  for (let i = 0; i < filteredStakes.length; i++) {
    for (let k = 0; k < referral_addresses.length; k++) {
      if (referral_addresses[k].user_address == filteredStakes[i]._id) {
        let amount_today_award =
          (filteredStakes[i].totalAmount *
            parseFloat(comissions[referral_addresses[k].lvl - 1])) /
          100;
        let maxCommissionLvl = maxCommision[referral_addresses[k].lvl - 1];
        maxCommissionLvl = parseFloat(maxCommissionLvl);
        comissions_of_addresses.push({
          address: referral_addresses[k].user_address,
          referral_address: referral_addresses[k].referral_address,
          amount_today: filteredStakes[i].totalAmount,
          lvl: referral_addresses[k].lvl,
          percent: comissions[referral_addresses[k].lvl - 1],
          amount_today_reward:
            maxCommissionLvl > amount_today_award ? amount_today_award : maxCommissionLvl,
        });
      }
    }
  }
  for (let i = 0; i < filteredStakesIds.length; i++) {
    stakeIds.push(filteredStakesIds[i]._id);
  }
  let write_tx = [];

  for (let i = 0; i < comissions_of_addresses.length; i++) {
    let tx_hash_generated = global_helper.make_hash();

    let tx_hash = ("0x" + tx_hash_generated).toLowerCase();
    let from = comissions_of_addresses[i];
    write_tx.push({
      from: from.address,
      to: from.referral_address,
      amount: parseFloat(from.amount_today_reward),
      tx_hash,
      tx_type: "bonus",
      tx_currency: "ether",
      tx_status: "approved",
      tx_options: {
        method: "referral",
        type: "uni",
        lvl: from.lvl,
        percent: from.percent,
      },
    });
  }
  const result = {};

  for (let i = 0; i < write_tx.length; i++) {
    const item = write_tx[i];
    const key = item.to;
    const value = 0 + item.amount;

    if (result.hasOwnProperty(key)) {
      result[key] += value;
    } else {
      result[key] = value;
    }
  }
  if (result && write_tx) {
    const transaction = await transactions.insertMany(write_tx);
    if (transaction) {
      const keyValueArray = Object.entries(result);
      for (let i = 0; i < keyValueArray.length; i++) {
        const [key, value] = keyValueArray[i];
        let accounts_change = await accounts.findOneAndUpdate(
          { address: key },
          { $inc: { balance: value } },
        );
      }
    }
  }
  if (filteredStakes.length > 0) {
    await stakes.updateMany(
      {
        _id: { $in: stakeIds },
      },
      {
        $set: {
          uni_placed: true,
        },
      },
    );
  }
  // console.log(write_tx);
  return write_tx;
};

const binary_comission_count = async (interval, address = null) => {
  try {
    let interval_ago = moment().subtract(interval, "days").startOf("day").valueOf();
    interval_ago = interval_ago / 1000;

    // let todayStartOfDay = moment().startOf("day").valueOf() / 1000;

    let referral_options = await options.findOne({
      key: "referral_binary_bv_options",
    });

    let bv = referral_options?.object_value?.binaryData?.bv
      ? referral_options?.object_value?.binaryData?.bv
      : 5000;
    bv = parseInt(bv);
    let bv_options_flushed_out = referral_options?.object_value?.binaryData?.flushed_out
      ? parseInt(referral_options?.object_value?.binaryData?.flushed_out)
      : 3;
    let bv_options = referral_options?.object_value?.binaryData?.options;
    const filteredStakes = await stakes.aggregate([
      {
        $match: {
          // staketime: { $gte: interval_ago, $lt: todayStartOfDay },
          staketime: { $gte: interval_ago },
          bv_placed: false,
        },
      },
      {
        $lookup: {
          from: "accounts",
          localField: "address",
          foreignField: "account_owner",
          as: "joinedAccounts",
        },
      },
      {
        $unwind: "$joinedAccounts",
      },
      {
        $group: {
          _id: "$joinedAccounts.address",
          totalAmount: { $sum: "$amount" },
        },
      },
      {
        $sort: { staketime: -1 },
      },
    ]);
    const filteredStakesIds = await stakes.aggregate([
      {
        $match: {
          // staketime: { $gte: interval_ago, $lt: todayStartOfDay },
          staketime: { $gte: interval_ago },
          bv_placed: false,
        },
      },
      {
        $sort: { staketime: -1 },
      },
    ]);

    let addresses_that_staked_this_interval = [];
    let stakeIds = [];
    for (let i = 0; i < filteredStakes.length; i++) {
      addresses_that_staked_this_interval.push(filteredStakes[i]._id);
    }
    for (let i = 0; i < filteredStakesIds.length; i++) {
      stakeIds.push(filteredStakesIds[i]._id);
    }

    // return { filteredStakes: filteredStakes.length, stakeIds: stakeIds.length };

    let referral_user_addresses = await referral_binary_users.find({
      user_address: { $in: addresses_that_staked_this_interval },
    });
    let addresses_that_staked_this_interval_parent = [];
    if (address) {
      addresses_that_staked_this_interval_parent = [address];
    } else {
      for (let i = 0; i < referral_user_addresses.length; i++) {
        addresses_that_staked_this_interval_parent.push(
          referral_user_addresses[i].referral_address,
        );
      }
    }

    let referral_addresses = await referral_binary_users.aggregate([
      {
        $match: {
          referral_address: { $in: addresses_that_staked_this_interval_parent },
        },
      },
      {
        $group: {
          _id: "$referral_address",
          documents: { $push: "$$ROOT" },
        },
      },
      {
        $sort: {
          "_id.referral_address": 1,
        },
      },
    ]);

    let calc_result = [];
    for (let i = 0; i < referral_addresses.length; i++) {
      let document = referral_addresses[i].documents;
      let amount_sum_left = 0;
      let amount_sum_right = 0;
      for (let k = 0; k < document.length; k++) {
        let one_doc = document[k];
        let this_addr_stake = _.find(filteredStakes, {
          _id: one_doc.user_address,
        });
        if (this_addr_stake) {
          if (one_doc.side == "left") {
            amount_sum_left += this_addr_stake.totalAmount;
          } else {
            amount_sum_right += this_addr_stake.totalAmount;
          }
        }
      }
      let side, amount;
      let account_check = await accounts.findOne({
        address: referral_addresses[i]._id,
      });
      const currentDate = new Date();
      const monthsPassed =
        (currentDate.getFullYear() - account_check.createdAt.getFullYear()) * 12 +
        (currentDate.getMonth() - account_check.createdAt.getMonth());

      let flush_out;
      if (
        (account_check?.flush_out &&
          account_check?.flush_out?.active &&
          monthsPassed < bv_options_flushed_out) ||
        (account_check?.flush_out &&
          Object.keys(account_check?.flush_out).length === 0) ||
        account_check?.flush_out == null
      ) {
        let flush_number = account_check?.flush_out?.number
          ? account_check?.flush_out?.number
          : 0;
        flush_number = parseInt(flush_number);

        let flush_active = flush_number < 2 ? true : false;
        let flush_left_amount =
          amount_sum_left > amount_sum_right ? amount_sum_right : amount_sum_left;
        let flush_left = account_check?.flush_out?.left
          ? account_check?.flush_out?.left
          : 0;
        flush_left = parseInt(flush_left);
        let flush_right = account_check?.flush_out?.right
          ? account_check?.flush_out?.right
          : 0;
        flush_right = parseInt(flush_right);
        flush_out = {
          active: flush_active,
          number: flush_number + 1,
          left: flush_left + (amount_sum_left - flush_left_amount),
          right: flush_right + (amount_sum_right - flush_left_amount),
        };
        await accounts.findOneAndUpdate(
          { address: referral_addresses[i]._id },
          {
            flush_out,
          },
        );
        amount_sum_left += flush_left;
        amount_sum_right += flush_right;
      }
      if (amount_sum_left > amount_sum_right) {
        side = "right";
        amount = amount_sum_right;
      } else {
        side = "left";
        amount = amount_sum_left;
      }

      if (amount != 0) {
        calc_result.push({
          address: referral_addresses[i]._id,
          side,
          amount,
        });
      }
    }

    let all_tx_to_be_done = [];
    for (let k = 0; k < calc_result.length; k++) {
      let one_calc = calc_result[k];
      let user_amount_added_by_lvl = [];
      let amount = one_calc.amount;
      if (amount == bv) {
        amount += 1;
      }

      let user_whole_amount = 0;
      for (let i = 0; i < bv_options.length; i++) {
        let oneBv = bv_options[i];
        if (amount > oneBv.from) {
          let amount_multip_prepare = amount - oneBv.from;
          if (i + 1 == 1) {
            amount_multip_prepare = amount;
          }
          if (oneBv.to && amount > oneBv.to) {
            amount_multip_prepare = oneBv.to;
          }

          let amunt_to_multiply = Math.floor(amount_multip_prepare / bv);
          let to_Add_amount = amunt_to_multiply * oneBv.price;
          user_amount_added_by_lvl.push({
            lvl: i + 1,
            amount: to_Add_amount,
            side: one_calc.side,
            amunt_to_multiply,
            price: oneBv.price,
            address: one_calc.address,
            one_calc_amount: one_calc.amount,
            amount_multip_prepare,
          });
          user_whole_amount += to_Add_amount;
        }
      }
      if (user_amount_added_by_lvl.length > 0) {
        all_tx_to_be_done.push({
          address: one_calc.address,
          amount: user_whole_amount,
          docs: user_amount_added_by_lvl,
        });
      }
    }
    let write_tx = [];
    for (let i = 0; i < all_tx_to_be_done.length; i++) {
      let tx_hash_generated = global_helper.make_hash();

      let tx_hash = ("0x" + tx_hash_generated).toLowerCase();

      let Txs = all_tx_to_be_done[i].docs;
      for (let k = 0; k < Txs.length; k++) {
        let oneTx = Txs[k];
        write_tx.push({
          from: oneTx.side,
          to: oneTx.address,
          amount: oneTx.amount,
          tx_hash,
          tx_type: "bonus",
          tx_currency: "ether",
          tx_status: "approved",
          tx_options: {
            method: "referral",
            type: "binary bv",
            lvl: oneTx.lvl,
          },
        });
      }
    }
    let transaction = await transactions.insertMany(write_tx);
    if (transaction) {
      for (let i = 0; i < all_tx_to_be_done.length; i++) {
        let one_tx = all_tx_to_be_done[i];
        let account_update = await accounts.findOneAndUpdate(
          { address: one_tx.address },
          { $inc: { balance: one_tx.amount } },
        );
      }
    }
    if (filteredStakes.length > 0) {
      await stakes.updateMany(
        {
          _id: { $in: stakeIds },
        },
        {
          $set: {
            bv_placed: true,
          },
        },
      );
    }

    return write_tx;
  } catch (e) {
    console.log(e.message);
    return false;
  }
};
const binary_comission_count_user = async (interval, referral_address) => {
  try {
    let interval_ago = moment().subtract(interval, "days").startOf("day").valueOf();
    interval_ago = interval_ago / 1000;
    let referral_options = await options.findOne({
      key: "referral_binary_bv_options",
    });

    let bv = referral_options?.object_value?.binaryData?.bv
      ? referral_options?.object_value?.binaryData?.bv
      : 5000;
    bv = parseInt(bv);
    let bv_options_flushed_out = referral_options?.object_value?.binaryData?.flushed_out
      ? parseInt(referral_options?.object_value?.binaryData?.flushed_out)
      : 3;
    let bv_options = referral_options?.object_value?.binaryData?.options;
    const filteredStakes = await stakes.aggregate([
      {
        $match: {
          staketime: { $gte: interval_ago },
          bv_placed: false,
        },
      },
      {
        $lookup: {
          from: "accounts",
          localField: "address",
          foreignField: "account_owner",
          as: "joinedAccounts",
        },
      },
      {
        $unwind: "$joinedAccounts",
      },
      {
        $group: {
          _id: "$joinedAccounts.address",
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);
    let addresses_that_staked_this_interval = [];
    for (let i = 0; i < filteredStakes.length; i++) {
      addresses_that_staked_this_interval.push(filteredStakes[i]._id);
    }
    let referral_addresses = await referral_binary_users.aggregate([
      {
        $match: {
          referral_address: referral_address,
        },
      },
      {
        $group: {
          _id: "$referral_address",
          documents: { $push: "$$ROOT" },
        },
      },
      {
        $sort: {
          "_id.referral_address": 1,
        },
      },
    ]);

    let calc_result = [];
    for (let i = 0; i < referral_addresses.length; i++) {
      let document = referral_addresses[i].documents;
      let amount_sum_left = 0;
      let amount_sum_right = 0;
      for (let k = 0; k < document.length; k++) {
        let one_doc = document[k];
        let this_addr_stake = _.find(filteredStakes, {
          _id: one_doc.user_address,
        });
        if (this_addr_stake) {
          if (one_doc.side == "left") {
            amount_sum_left += this_addr_stake.totalAmount;
          } else {
            amount_sum_right += this_addr_stake.totalAmount;
          }
        }
      }
      let side, amount;
      let account_check = await accounts.findOne({
        address: referral_addresses[i]._id,
      });
      const currentDate = new Date();
      const monthsPassed =
        (currentDate.getFullYear() - account_check.createdAt.getFullYear()) * 12 +
        (currentDate.getMonth() - account_check.createdAt.getMonth());

      let flush_out;
      if (
        (account_check?.flush_out &&
          account_check?.flush_out?.active &&
          monthsPassed < bv_options_flushed_out) ||
        (account_check?.flush_out &&
          Object.keys(account_check?.flush_out).length === 0) ||
        account_check?.flush_out == null
      ) {
        let flush_number = account_check?.flush_out?.number
          ? account_check?.flush_out?.number
          : 0;
        flush_number = parseInt(flush_number);

        let flush_active = flush_number < 2 ? true : false;
        let flush_left_amount =
          amount_sum_left > amount_sum_right ? amount_sum_right : amount_sum_left;
        let flush_left = account_check?.flush_out?.left
          ? account_check?.flush_out?.left
          : 0;
        flush_left = parseInt(flush_left);
        let flush_right = account_check?.flush_out?.right
          ? account_check?.flush_out?.right
          : 0;
        flush_right = parseInt(flush_right);
        flush_out = {
          active: flush_active,
          number: flush_number + 1,
          left: flush_left + (amount_sum_left - flush_left_amount),
          right: flush_right + (amount_sum_right - flush_left_amount),
        };
        await accounts.findOneAndUpdate(
          { address: referral_addresses[i]._id },
          {
            flush_out,
          },
        );
        amount_sum_left += flush_left;
        amount_sum_right += flush_right;
      }
      if (amount_sum_left > amount_sum_right) {
        side = "right";
        amount = amount_sum_right;
      } else {
        side = "left";
        amount = amount_sum_left;
      }

      if (amount != 0) {
        calc_result.push({
          address: referral_addresses[i]._id,
          side,
          amount,
          amount_sum_left,
          amount_sum_right,
        });
      }
    }

    let all_amount_sum = 0;
    let left_total = 0;
    let total_right = 0;
    for (let k = 0; k < calc_result.length; k++) {
      let one_calc = calc_result[k];
      let amount = one_calc.amount;
      if (amount == bv) {
        amount += 1;
      }
      left_total = one_calc.amount_sum_left;
      total_right = one_calc.amount_sum_right;
      for (let i = 0; i < bv_options.length; i++) {
        let oneBv = bv_options[i];
        if (amount > oneBv.from) {
          let amount_multip_prepare = amount - oneBv.from;
          if (i + 1 == 1) {
            amount_multip_prepare = amount;
          }
          if (oneBv.to && amount > oneBv.to) {
            amount_multip_prepare = oneBv.to;
          }

          let amunt_to_multiply = Math.floor(amount_multip_prepare / bv);
          let to_Add_amount = amunt_to_multiply * oneBv.price;
          all_amount_sum += to_Add_amount;
        }
      }
    }
    return {
      all_amount_sum,
      left_total,
      total_right,
    };
  } catch (e) {
    console.log(e.message);
    return false;
  }
};

const uni_comission_count_user = async (interval, referral_address) => {
  try {
    let referral_options = await options.findOne({
      key: "referral_uni_options",
    });
    let bv = referral_options?.object_value?.binaryData?.lvlOptions;
    // if()
    let comissions =
      referral_options?.object_value?.uniData?.lvlOptions?.maxCommPercentage;
    let maxCommision = referral_options?.object_value?.uniData?.lvlOptions?.maxCommision;

    let interval_ago = moment().subtract(interval, "days").startOf("day").valueOf();
    let amount = 0;

    interval_ago = interval_ago / 1000;
    const filteredStakes = await stakes.aggregate([
      {
        $match: {
          staketime: { $gte: interval_ago },
          uni_placed: false,
        },
      },
      {
        $lookup: {
          from: "accounts",
          localField: "address",
          foreignField: "account_owner",
          as: "joinedAccounts",
        },
      },
      {
        $unwind: "$joinedAccounts",
      },
      {
        $group: {
          _id: "$joinedAccounts.address",
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);
    let addresses_that_staked_this_interval = [];

    for (let i = 0; i < filteredStakes.length; i++) {
      addresses_that_staked_this_interval.push(filteredStakes[i]._id);
    }

    let comissions_of_addresses = [];
    let stakeIds = [];
    let referral_addresses = await referral_uni_users.find({
      user_address: { $in: addresses_that_staked_this_interval },
      referral_address: referral_address,
    });
    for (let i = 0; i < filteredStakes.length; i++) {
      for (let k = 0; k < referral_addresses.length; k++) {
        if (referral_addresses[k].user_address == filteredStakes[i]._id) {
          let amount_today_award =
            (filteredStakes[i].totalAmount *
              parseFloat(comissions[referral_addresses[k].lvl - 1])) /
            100;
          let maxCommissionLvl = maxCommision[referral_addresses[k].lvl - 1];
          maxCommissionLvl = parseFloat(maxCommissionLvl);
          amount += parseFloat(
            maxCommissionLvl > amount_today_award ? amount_today_award : maxCommissionLvl,
          );
        }
      }
    }
    return amount;
  } catch (e) {
    console.log(e.message);
    return false;
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

function hideName(name) {
  if (name.length <= 2) {
    return name;
  }

  const firstLetter = name.charAt(0);
  const lastLetter = name.charAt(name.length - 1);
  const middleAsterisks = "*".repeat(name.length - 2);

  return firstLetter + middleAsterisks + lastLetter;
}

module.exports = {
  uni_comission_count,
  binary_comission_count,
  register_referral,
  get_referral_data,
  get_referral_tree,
  get_referral_data_uni,
  get_referral_code,
  get_referral_uni_transactions,
  get_referral_binary_transactions,
  get_reerral_global_data,
  get_referral_address,
  get_referral_parent_address,
  get_referral_options,
  cron_test,
  binary_comission_count_user,
  uni_comission_count_user,
  check_referral_available,
};
