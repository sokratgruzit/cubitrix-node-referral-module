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
    let binary_max_lvl = 11;
    let free_spaces = await check_free_space_for_user(
      referral_address,
      side,
      binary_max_lvl
    );

    if (free_spaces && Array.isArray(free_spaces) && free_spaces.length > 0) {
      let free_space = free_spaces[0];
      const parts = referral_address.split("_");
      let returndata = {
        referral_address: parts[0],
        user_address,
        lvl: free_space.lvl,
        position: free_space.position,
      };
      return returndata;
    } else {
      return free_spaces;
    }

    let last_referral_lvl_for_user = await referral_binary_users
      .findOne({
        referral_address,
      })
      .sort({ lvl: -1, position: -1 });
    let returndata = {
      referral_address,
      user_address,
      lvl: 1,
      side: "left",
      position: 1,
    };

    return returndata;
    if (last_referral_lvl_for_user) {
      let lvl_max_position = Math.pow(2, last_referral_lvl_for_user.lvl);
      let lvl_for_new_user, position_for_new_user, side_for_new_user;
      console.log(lvl_max_position > last_referral_lvl_for_user.position);
      //   return false;
      if (lvl_max_position > last_referral_lvl_for_user.position) {
        lvl_for_new_user = last_referral_lvl_for_user.lvl;
        position_for_new_user = last_referral_lvl_for_user.position + 1;
      } else {
        lvl_for_new_user = last_referral_lvl_for_user.lvl + 1;
        position_for_new_user = 1;
      }

      if (position_for_new_user <= lvl_max_position / 2) {
        side_for_new_user = "left";
      } else {
        side_for_new_user = "right";
      }

      return returndata;
    } else {
      return returndata;
    }

    return false;
  } catch (e) {
    console.log(e.message);
    return false;
  }
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

    console.log(parts);

    let additional_param = [{ referral_address: referral_address }];

    let check_referral_for_users = await referral_binary_users.aggregate([
      { $match: { $and: additional_param } },
      {
        $group: {
          _id: "$lvl",
          documents: { $push: "$$ROOT" },
          count: { $sum: 1 },
        },
      },
    ]);
    let all_referral_for_users = await referral_binary_users.find({
      referral_address: referral_address,
    });
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
    let max_level = 0;
    let free_positions = [];
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
      if (max_level < check_one._id) {
        max_level = check_one._id;
      }
    }
    for (let i = max_level + 1; i <= binary_max_lvl; i++) {
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
