/**
 * Apple App Store validation 90778 対応用 config plugin。
 *
 * react-native-nfc-manager の Expo plugin が
 *   com.apple.developer.nfc.readersession.formats
 * に常に ["NDEF", "TAG"] を書き込むが、Xcode 26 / iOS SDK 26 系では
 * "NDEF" 値が禁止されて TestFlight アップロードが弾かれる
 * (Invalid entitlement ... 'NDEF is disallowed'. (90778))。
 *
 * NDEF リーダー機能 (NFCNDEFReaderSession) は entitlement の formats に
 * "NDEF" が無くても Info.plist の NFCReaderUsageDescription だけで
 * 動作するため、ここでは "NDEF" のみを除去して "TAG" を残す。
 *
 * plugin の登録順は必ず react-native-nfc-manager の "後" に置くこと。
 */
const { withEntitlementsPlist } = require("expo/config-plugins");

const FORMATS_KEY = "com.apple.developer.nfc.readersession.formats";

function withRemoveNfcNdefEntitlement(config) {
  return withEntitlementsPlist(config, (mod) => {
    try {
      if (mod && mod.modResults && Object.prototype.hasOwnProperty.call(mod.modResults, FORMATS_KEY)) {
        const formats = mod.modResults[FORMATS_KEY];
        if (Array.isArray(formats)) {
          const filtered = formats.filter(function (v) {
            return v !== "NDEF";
          });
          if (filtered.length === 0) {
            delete mod.modResults[FORMATS_KEY];
          } else {
            mod.modResults[FORMATS_KEY] = filtered;
          }
        }
      }
    } catch (e) {
      // entitlement 編集に失敗してもビルド自体は止めない
      // eslint-disable-next-line no-console
      console.warn("[withRemoveNfcNdefEntitlement] failed to strip NDEF:", e);
    }
    return mod;
  });
}

module.exports = withRemoveNfcNdefEntitlement;
