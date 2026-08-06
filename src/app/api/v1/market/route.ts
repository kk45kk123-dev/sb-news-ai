import { apiOk } from "@/lib/api-response";
import { getMarketSnapshot } from "@/server/services/market.service";

export async function GET() {
  const snapshot = await getMarketSnapshot();
  return apiOk(snapshot);
}
