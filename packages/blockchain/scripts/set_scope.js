const hre = require("hardhat");
const fs = require("fs");
require("dotenv").config();

async function main() {
    console.log("Setting scope for ProofOfHuman contract...");

    // Read deployment info
    if (!fs.existsSync("./deployments/latest.json")) {
        console.error("No deployment found. Please deploy the contract first.");
        process.exit(1);
    }

    const contractAddress = "0xA9E2401B5d6F27Ae2357d9982cF51C133D80a844";

    console.log("Using contract at:", contractAddress);
    console.log("Network:", hre.network.name);

    // Get the new scope value from environment variable
    const newScope = "16287011142285698908106984502014692743847180384076451682875639445757153890855";

    if (!newScope) {
        console.error("Please provide the new scope value:");
        console.error("Set NEW_SCOPE environment variable:");
        console.error("  NEW_SCOPE=<scope_value> npx hardhat run scripts/set_scope.js --network <network>");
        console.error("");
        console.error("Example:");
        console.error("NEW_SCOPE=1234567890 npx hardhat run scripts/set_scope.js --network alfajores");
        process.exit(1);
    }

    console.log("Setting scope to:", newScope);

    // Get the contract instance
    const ProofOfHuman = await hre.ethers.getContractFactory("ProofOfHuman");
    const proofOfHuman = ProofOfHuman.attach(contractAddress);

    // Get current scope for comparison
    try {
        const currentScope = await proofOfHuman.scope();
        console.log("Current scope:", currentScope.toString());
    } catch (error) {
        console.log("Could not read current scope:", error.message);
    }

    // Call setScope function
    console.log("Calling setScope...");
    try {
        const tx = await proofOfHuman.setScope(newScope);
        console.log("Transaction hash:", tx.hash);

        // Wait for transaction confirmation
        console.log("Waiting for transaction confirmation...");
        const receipt = await tx.wait();
        console.log("Transaction confirmed in block:", receipt.blockNumber);

        // Verify the scope was updated
        const updatedScope = await proofOfHuman.scope();
        console.log("Updated scope:", updatedScope.toString());

        console.log("\nScope update complete!");

    } catch (error) {
        console.error("Failed to set scope:", error.message);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
