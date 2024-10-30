/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo/ios",
  setupFilesAfterEnv: ["./jest-setup.js"],
  testEnvironment: "node",
  testPathIgnorePatterns: ["utils.tsx$"],
};
