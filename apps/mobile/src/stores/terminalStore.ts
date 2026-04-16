import { create } from "zustand";
import type { Reader } from "@stripe/stripe-terminal-react-native";

type ReaderStatus = "disconnected" | "discovering" | "connecting" | "connected";
type PaymentStatus =
  | "idle"
  | "creating"
  | "collecting"
  | "processing"
  | "capturing"
  | "succeeded"
  | "failed"
  | "cancelled";

interface TerminalState {
  readerStatus: ReaderStatus;
  connectedReader: Reader.Type | null;
  discoveredReaders: Reader.Type[];
  readerError: string | null;

  paymentStatus: PaymentStatus;
  paymentError: string | null;
  lastReceiptData: Record<string, unknown> | null;

  setReaderStatus: (status: ReaderStatus) => void;
  setConnectedReader: (reader: Reader.Type | null) => void;
  setDiscoveredReaders: (readers: Reader.Type[]) => void;
  setReaderError: (error: string | null) => void;

  setPaymentStatus: (status: PaymentStatus) => void;
  setPaymentError: (error: string | null) => void;
  setLastReceiptData: (data: Record<string, unknown> | null) => void;
  resetPayment: () => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
  readerStatus: "disconnected",
  connectedReader: null,
  discoveredReaders: [],
  readerError: null,

  paymentStatus: "idle",
  paymentError: null,
  lastReceiptData: null,

  setReaderStatus: (readerStatus) => set({ readerStatus }),
  setConnectedReader: (connectedReader) => set({ connectedReader }),
  setDiscoveredReaders: (discoveredReaders) => set({ discoveredReaders }),
  setReaderError: (readerError) => set({ readerError }),

  setPaymentStatus: (paymentStatus) => set({ paymentStatus }),
  setPaymentError: (paymentError) => set({ paymentError }),
  setLastReceiptData: (lastReceiptData) => set({ lastReceiptData }),

  resetPayment: () =>
    set({
      paymentStatus: "idle",
      paymentError: null,
      lastReceiptData: null,
    }),
}));
