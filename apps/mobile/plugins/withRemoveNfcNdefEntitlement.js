/**
 * Apple App Store validation 90778 対応用 config plugin。
 *
 * 背景:
 *   react-native-nfc-manager の Expo plugin (withNfc) が
 *   ios の entitlement
 *     com.apple.developer.nfc.readersession.formats
 *   に常に ["NDEF", "TAG"] を書き込むが、Xcode 26 / iOS SDK 26 系では
 *   "NDEF" 値が禁止されるようになり、TestFlight アップロード時に
 *     Invalid entitlement for core nfc framework. ... 'NDEF is disallowed'. (90778)
 *   と弾かれる。
 *
 *   NDEF リーダー機能 (NFCNDEFReaderSession) は entitlement の formats に
 *   "NDEF" が無くても Info.plist の NFCReaderUsageDescription だけで
 *   動作するため、ここでは "NDEF" のみを除去して "TAG" を残す。
 *
 *   plugin の登録順は必ず react-native-nfc-manager の "後" に置くこと
 *   （後から書き込んだ plugin が勝つため）。
 */
const { withEntitlementsPlist } = require("expo/config-plugins");

const FORMATS_KEY = "com.apple.developer.nfc.readersession.formats";

module.exports = function withRemoveNfcNdefEntitlement(config) {
  return withEntitlementsPlist(config, (mod) => {
    const formats = mod.modResults?.[FORMATS_KEY];
    if (Array.isArray(formats)) {
      const filtered = formats.filter((v) => v !== "NDEF");
      // formats が空になる場合はキー自体を削除
      if (filtered.length === 0) {
        delete mod.modResults[FORMATS_KEY];
      } else {
        mod.modResults[FORMATS_KEY] = filtered;
      }
    }
    return mod;
  });
};
