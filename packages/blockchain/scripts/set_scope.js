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

    const contractAddress = "0xAd0329D4Cfa5B18ed847AAfFe13c3358fe174730";

    console.log("Using contract at:", contractAddress);
    console.log("Network:", hre.network.name);

    // Get the new scope value from environment variable
    const newScope = "17386951647607972005560556506245383706938694668941631155676107991037506170794";

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
