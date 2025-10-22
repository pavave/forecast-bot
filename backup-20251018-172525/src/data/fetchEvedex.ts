import { evedexSdk } from "@evedex/exchange-bot-sdk";
import { WebSocket } from "ws";

export async function streamEvedexMarket(pair: string, onTick: (tick: any) => void) {
  const container = new evedexSdk.ProdContainer({
    centrifugeWebSocket: WebSocket,
    wallets: { baseAccount: { privateKey: process.env.PRIVATE_KEY || "" } },
  });

  const account = await container.account();
  account.subscribeMarket(pair, onTick);
}

