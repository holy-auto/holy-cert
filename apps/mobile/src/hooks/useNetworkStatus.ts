import { useEffect, useState } from "react";
import NetInfo, {
  NetInfoStateType,
  type NetInfoState,
} from "@react-native-community/netinfo";

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: NetInfoState["type"];
}

const INITIAL: NetworkStatus = {
  isConnected: true,
  isInternetReachable: null,
  type: NetInfoStateType.unknown,
};

/**
 * NetInfo の状態を購読するフック。
 * 初回マウント時に fetch、その後 addEventListener で更新。
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(INITIAL);

  useEffect(() => {
    let mounted = true;

    NetInfo.fetch().then((state) => {
      if (!mounted) return;
      setStatus({
        isConnected: state.isConnected ?? true,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      setStatus({
        isConnected: state.isConnected ?? true,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return status;
}

/**
 * "実用的にオフライン" を返す。isConnected=false、または iOS/Android で
 * インターネット到達不可と確認された場合。null (未判定) は接続扱い。
 */
export function isEffectivelyOffline(s: NetworkStatus): boolean {
  if (!s.isConnected) return true;
  if (s.isInternetReachable === false) return true;
  return false;
}
