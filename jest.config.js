export default {
  testEnvironment: "node",
  transform: {},
  moduleFileExtensions: ["js", "mjs"],
  testMatch: ["**/test/**/*.test.js", "**/tests/**/*.test.js"],
  verbose: true,
  moduleNameMapper: {
    "^.*services/db/get_last_n_msgs/get_last_n_msgs\\.js$": "<rootDir>/test/__mocks__/getLastNMsgs.js",
  },
};