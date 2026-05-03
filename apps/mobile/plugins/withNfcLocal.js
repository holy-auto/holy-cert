/**
 * react-native-nfc-manager の Expo plugin を完全置き換えするローカル版。
 *
 * 元の plugin (node_modules/react-native-nfc-manager/app.plugin.js) は
 * com.apple.developer.nfc.readersession.formats に常に "NDEF" を含めるが、
 * iOS 26 SDK 以降は NDEF 値が disallowed となり App Store validation 90778 で蹴られる。
 *
 * 本 plugin は元の挙動を踏襲しつつ、NDEF を一切書かない。
 * NDEF タグの読取自体は NFCNDEFReaderSession 経由で動作するため、
 * Info.plist の NFCReaderUsageDescription があれば JS 側コードはそのまま動く。
 *
 * app.json の plugins 配列で "react-native-nfc-manager" の代わりに
 * "./plugins/withNfcLocal" を指定して使う。
 */
const {
  AndroidConfig,
  withInfoPlist,
  withEntitlementsPlist,
} = require("@expo/config-plugins");

const NFC_READER_DEFAULT = "Interact with nearby NFC devices";

function addValuesToArray(obj, key, values) {
  if (!Array.isArray(values) || !values.length) return obj;
  if (!Array.isArray(obj[key])) obj[key] = [];
  obj[key].push(...values);
  obj[key] = [...new Set(obj[key])];
  if (!obj[key].length) delete obj[key];
  return obj;
}

function withIosPermission(config, props) {
  const { nfcPermission } = props || {};
  return withInfoPlist(config, (mod) => {
    mod.modResults.NFCReaderUsageDescription =
      nfcPermission ||
      mod.modResults.NFCReaderUsageDescription ||
      NFC_READER_DEFAULT;
    return mod;
  });
}

function withIosNfcEntitlement(config) {
  return withEntitlementsPlist(config, (mod) => {
    // iOS 26 SDK で NDEF は disallowed。TAG のみ宣言する。
    mod.modResults = addValuesToArray(
      mod.modResults,
      "com.apple.developer.nfc.readersession.formats",
      ["TAG"],
    );
    return mod;
  });
}

function withIosNfcSelectIdentifiers(config, props) {
  const { selectIdentifiers } = props || {};
  return withInfoPlist(config, (mod) => {
    mod.modResults = addValuesToArray(
      mod.modResults,
      "com.apple.developer.nfc.readersession.iso7816.select-identifiers",
      selectIdentifiers || [],
    );
    return mod;
  });
}

function withIosNfcSystemCodes(config, props) {
  const { systemCodes } = props || {};
  return withInfoPlist(config, (mod) => {
    mod.modResults = addValuesToArray(
      mod.modResults,
      "com.apple.developer.nfc.readersession.felica.systemcodes",
      systemCodes || [],
    );
    return mod;
  });
}

function withNfcLocal(config, props = {}) {
  config = withIosNfcEntitlement(config);
  config = withIosNfcSelectIdentifiers(config, props);
  config = withIosNfcSystemCodes(config, props);
  config = AndroidConfig.Version.withBuildScriptExtMinimumVersion(config, {
    name: "compileSdkVersion",
    minVersion: 31,
  });
  if (props.nfcPermission !== false) {
    config = withIosPermission(config, props);
    config = AndroidConfig.Permissions.withPermissions(config, [
      "android.permission.NFC",
    ]);
  }
  return config;
}

module.exports = withNfcLocal;
