const {
  referral_uni_users,
  referral_binary_users,
  referral_links,
  accounts,
  transactions,
  stakes,
  options,
} = require("@cubitrix/models");
const main_helper = require("../helpers/index");
const global_helper = require("../helpers/global_helper");
const moment = require("moment");
const crypto = require("crypto");

// sides can be ["auto", "left", "right", "selected"]
const calculate_referral_best_place = async (
  referral_address,
  user_address,
  side = "auto",
) => {
  try {
    // now 11 later will take from admin
    // let binary_data_settings = await options.findOne({ key: "Binary Bv" });
    // console.log(binary_data_settings);
    // return binary_data_settings;
    let recursion;
    let referral_options = await options.findOne({
      key: "referral_binary_bv_options",
    });
    let binary_max_lvl = referral_options?.object_value?.binaryData?.maxUsers
      ? referral_options?.object_value?.binaryData?.maxUsers
      : 11;
    binary_max_lvl = parseInt(binary_max_lvl);
    let free_spaces = await check_free_space_for_user(
      referral_address,
      side,
      binary_max_lvl,
    );

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
        returndata.position,
        [],
        returndata.referral_address,
      );

      return recursion;
    } else if (returndata.lvl > 1) {
      let position = 1;
      let parent_position = Math.ceil(returndata.position / 2);
      if (returndata.position % 2 == 0) {
        position = 2;
      }
      let find_parent = await referral_binary_users.findOne({
        referral_address: returndata.referral_address,
        lvl: returndata.lvl - 1,
        position: parent_position,
      });

      //   return;
      recursion = await binary_recursion(
        returndata.user_address,
        find_parent.user_address,
        1,
        position,
        returndata.position,
        [],
        find_parent.user_address,
      );
    }

    return recursion;
  } catch (e) {
    console.log(e.message);
    return false;
  }
};

const calculate_referral_best_place_uni = async (
  referral_address,
  user_address,
  lvl,
  final_data,
) => {
  let assign_ref_to_user = await referral_uni_users.create({
    referral_address,
    user_address,
    lvl,
  });
  let referral_options = await options.findOne({
    key: "referral_uni_options",
  });
  let uni_max_level = referral_options?.object_value?.uniData?.level
    ? referral_options?.object_value?.uniData?.level
    : 10;
  uni_max_level = parseInt(uni_max_level);
  if (assign_ref_to_user && lvl <= uni_max_level) {
    final_data.push(assign_ref_to_user);
    let user_parent_ref = await referral_uni_users.findOne({
      user_address: referral_address,
      lvl: 1,
    });
    if (user_parent_ref) {
      return await calculate_referral_best_place_uni(
        user_parent_ref.referral_address,
        user_address,
        lvl + 1,
        final_data,
      );
    }
  }
  return final_data;
};

const binary_recursion = async (
  user_address,
  referral_address_modified,
  lvl,
  position,
  last_position,
  final_data = [],
  referral_address,
) => {
  let referral_options = await options.findOne({
    key: "referral_binary_bv_options",
  });
  let max_level_binary = referral_options?.object_value?.binaryData?.maxUsers
    ? referral_options?.object_value?.binaryData?.maxUsers
    : 11;
  max_level_binary = parseInt(max_level_binary);
  let already_exists = await referral_binary_users.findOne({
    user_address: user_address,
    referral_address: referral_address_modified,
  });
  if (already_exists) {
    return final_data;
  }
  let max_lvl_position = Math.pow(2, lvl);
  let side = "right";
  if (position <= max_lvl_position / 2) {
    side = "left";
  }
  let assign_ref_to_user = await referral_binary_users.create({
    user_address,
    referral_address: referral_address_modified,
    lvl,
    side,
    position,
  });
  if (assign_ref_to_user && lvl <= max_level_binary) {
    final_data.push(assign_ref_to_user);
    let user_parent_ref = await referral_binary_users.findOne({
      user_address: referral_address,
      lvl: lvl,
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
        final_data,
        referral_address,
      );
    }
  }
  return final_data;
};

const secretKey = "YourSecretKey";

function encrypt(address, lvl, position, main_address) {
  const cipher = crypto.createCipher("aes-256-cbc", secretKey);
  let plaintext = lvl + "_" + position + "_" + main_address;
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  return address + "_" + encrypted;
}

function decrypt(encryptedText) {
  const decipher = crypto.createDecipher("aes-256-cbc", secretKey);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function hashSecretKey(secretKey) {
  const hash = crypto.createHash("sha256");
  return hash.update(secretKey).digest("hex");
}

const check_free_space_for_user = async (referral_code, side, binary_max_lvl) => {
  try {
    const parts = referral_code.split("_");
    if (parts.length < 1) {
      return false;
    }

    let referral_address = parts[0];
    if (parts.length == 2) {
      const hashedSecretKey = hashSecretKey(secretKey);
      const decryptedText = decrypt(parts[1], hashedSecretKey);
      const parts2 = decryptedText.split("_");
      console.log(parts2);
      let check_manual_referral_used = await referral_binary_users.findOne({
        referral_address: referral_address,
        lvl: parseInt(parts2[0]),
        position: parseInt(parts2[1]),
      });
      if (check_manual_referral_used) {
        return "code is already used";
      } else {
        return [
          {
            lvl: parseInt(parts2[0]),
            position: parseInt(parts2[1]),
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

module.exports = {
  calculate_referral_best_place,
  calculate_referral_best_place_uni,
  encrypt,
  decrypt,
};