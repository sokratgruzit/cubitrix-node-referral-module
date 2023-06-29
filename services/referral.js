const {
  referral_uni_users,
  referral_binary_users,
  referral_links,
  accounts,
  transactions,
} = require("@cubitrix/models");
const main_helper = require("../helpers/index");
const global_helper = require("../helpers/global_helper");

// sides can be ["auto", "left", "right", "selected"]
const calculate_referral_best_place = async (
  referral_address,
  user_address,
  side = "auto"
) => {
  try {
    // now 11 later will take from admin
    let recursion;
    let binary_max_lvl = 11;
    let free_spaces = await check_free_space_for_user(
      referral_address,
      side,
      binary_max_lvl
    );
    // console.log(free_spaces);
    let returndata;
    if (free_spaces && Array.isArray(free_spaces) && free_spaces.length > 0) {
      let free_space = free_spaces[0];
      const parts = referral_address.split("_");
      returndata = {
        referral_address: parts[0],
        user_address,
        lvl: free_space.lvl,
        position: free_space.position,
      };
    } else {
      return free_spaces;
    }

    if (returndata.lvl == 1) {
      recursion = await binary_recursion(
        returndata.user_address,
        returndata.referral_address,
        returndata.lvl,
        returndata.position,
        returndata.position
      );
      return recursion;
    } else if (returndata.lvl > 1) {
      let position = 1;
      let parent_position = Math.ceil(returndata.position / 2);
      if (returndata.position % 2 == 0) {
        position = 2;
      }
      console.log(returndata);
      let find_parent = await referral_binary_users.findOne({
        referral_address: returndata.referral_address,
        lvl: returndata.lvl - 1,
        position: parent_position,
      });
      console.log(find_parent);
      //   return;
      recursion = await binary_recursion(
        returndata.user_address,
        find_parent.user_address,
        1,
        position,
        returndata.position
      );
    }

    return recursion;
  } catch (e) {
    console.log(e.message);
    return false;
  }
};

const binary_recursion = async (
  user_address,
  referral_address,
  lvl,
  position,
  last_position,
  final_data = []
) => {
  let max_level_binary = 11;
  let already_exists = await referral_binary_users.findOne({
    user_address: user_address,
    referral_address: referral_address,
  });
  if (already_exists) {
    return final_data;
  }
  let assign_ref_to_user = await referral_binary_users.create({
    user_address,
    referral_address,
    lvl,
    position,
  });
  console.log(assign_ref_to_user, lvl, max_level_binary);
  if (assign_ref_to_user && lvl <= max_level_binary) {
    final_data.push(assign_ref_to_user);
    let user_parent_ref = await referral_binary_users.findOne({
      user_address: referral_address,
      lvl: 1,
    });
    if (user_parent_ref) {
      let real_position_for_calc = user_parent_ref.position;
      let real_position;
      if (last_position % 2 === 0) {
        real_position = real_position_for_calc * 2;
      } else {
        real_position = real_position_for_calc * 2 - 1;
      }
      return await binary_recursion(
        user_address,
        user_parent_ref.referral_address,
        lvl + 1,
        real_position,
        last_position,
        final_data
      );
    }
  }
  return final_data;
};

const check_free_space_for_user = async (
  referral_code,
  side,
  binary_max_lvl
) => {
  try {
    const parts = referral_code.split("_");
    if (parts.length < 1) {
      return false;
    }
    let referral_address = parts[0];
    if (parts.length == 3) {
      let check_manual_referral_used = await referral_binary_users.findOne({
        referral_address: referral_address,
        lvl: parts[1],
        position: parts[2],
      });
      if (check_manual_referral_used) {
        return "code is already used";
      } else {
        return [
          {
            lvl: parts[1],
            position: parts[2],
          },
        ];
      }
    }

    let check_referral_for_users = await referral_binary_users.aggregate([
      { $match: { referral_address: referral_address } },
      {
        $group: {
          _id: "$lvl",
          documents: { $push: "$$ROOT" },
          count: { $sum: 1 },
        },
      },
    ]);
    let max_referral_lvl_for_user_used = 0;
    let freespaces = [];
    for (let i = 0; i < check_referral_for_users.length; i++) {
      let check_one = check_referral_for_users[i];
      let max_pow = Math.pow(2, check_one._id);
      if (check_one._id > max_referral_lvl_for_user_used) {
        max_referral_lvl_for_user_used = check_one._id;
      }
      if (max_pow > check_one.count) {
        freespaces.push(check_one);
      }
    }
    let free_positions = [];
    console.log(check_referral_for_users, max_referral_lvl_for_user_used);
    for (let k = 0; k < freespaces.length; k++) {
      let check_one = freespaces[k];
      let max_pow = Math.pow(2, check_one._id);
      for (let j = 1; j <= max_pow; j++) {
        let checked = false;

        for (let d = 0; d < check_one.documents.length; d++) {
          if (j == check_one.documents[d].position) {
            checked = true;
          }
        }
        if (!checked) {
          free_positions.push({
            lvl: check_one._id,
            position: j,
          });
        }
      }
    }
    for (let i = max_referral_lvl_for_user_used + 1; i <= binary_max_lvl; i++) {
      let max_pow = Math.pow(2, i);
      for (let k = 1; k <= max_pow; k++) {
        free_positions.push({
          lvl: i,
          position: k,
        });
      }
    }
    let final_free_spaces = [];
    if (side == "auto") {
      final_free_spaces = free_positions;
    } else if (side == "left") {
      for (let i = 0; i < free_positions.length; i++) {
        let row = free_positions[i];
        let max_pow = Math.pow(2, row.lvl);
        let max_left = max_pow / 2;
        if (max_left >= row.position) {
          final_free_spaces.push(row);
        }
      }
    } else if (side == "right") {
      for (let i = 0; i < free_positions.length; i++) {
        let row = free_positions[i];
        let max_pow = Math.pow(2, row.lvl);
        let max_left = max_pow / 2;
        if (max_left < row.position) {
          final_free_spaces.push(row);
        }
      }
    }
    final_free_spaces.sort((a, b) => {
      if (a.lvl === b.lvl) {
        return a.position - b.position;
      }
      return a.lvl - b.lvl;
    });

    return final_free_spaces;
  } catch (e) {
    console.log(e.message);
    return false;
  }
};

module.exports = { calculate_referral_best_place };
