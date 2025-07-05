import { useEffect } from "react";
import { ethers } from "ethers";

interface Props {
  userId: string; // Ethereum address of the current user
}

export default function AutoCompleteUserData({ userId }: Props) {
  useEffect(() => {
    if (!userId) return;

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_USER_REGISTRY_ADDRESS!,
      [
        "event UserRegistered(address indexed user, uint256 timestamp, string name, string nationality, string dateOfBirth)",
        "function completeUserData(address userAddress, string calldata name, string calldata nationality, string calldata dateOfBirth) external",
      ],
      provider
    );

    const signer = provider.getSigner();
    const contractWithSigner = contract.connect(signer);

    const onUserRegistered = async (
      user: string,
      timestamp: ethers.BigNumber,
      name: string,
      nationality: string,
      dateOfBirth: string
    ) => {
      if (user.toLowerCase() !== userId.toLowerCase()) return;

      try {
        await contractWithSigner.completeUserData(user, name, nationality, dateOfBirth);
        console.log("✅ User data completed");
      } catch (error) {
        console.error("❌ Failed to complete user data", error);
      }
    };

    contract.on("UserRegistered", onUserRegistered);

    return () => {
      contract.off("UserRegistered", onUserRegistered);
    };
  }, [userId]);

  return null; // No UI, just a background hook
}
