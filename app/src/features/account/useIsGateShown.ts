import { useAccount } from "./accountContext";
import { useOtherModalOpen } from "./useOtherModalOpen";

/** La puerta se ve cuando hay una pedida y ningún otro diálogo modal va primero. */
export function useIsGateShown(): boolean {
  const { gate } = useAccount();
  const isOtherModalOpen = useOtherModalOpen(gate !== null);
  return gate !== null && !isOtherModalOpen;
}
