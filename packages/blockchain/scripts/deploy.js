const hre = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Starting FreePress Platform deployment...\n");

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  // For ethers v6, use provider.getBalance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Configuration
  const mockScope = 1; // Update after deployment using https://tools.self.xyz
  const hubAddress = process.env.IDENTITY_VERIFICATION_HUB;
  const verificationConfigId = process.env.VERIFICATION_CONFIG_ID;

  console.log("Configuration:");
  console.log("- IdentityVerificationHub:", hubAddress);
  console.log("- VerificationConfigId:", verificationConfigId);
  console.log("- Network:", hre.network.name, "\n");

  // Store deployed addresses
  const deployedContracts = {};

  try {
    // 1. Deploy FreePressToken
    console.log("1. Deploying FreePressToken...");
    const FreePressToken = await hre.ethers.getContractFactory("FreePressToken");
    const freePressToken = await FreePressToken.deploy();
    await freePressToken.waitForDeployment();
    deployedContracts.freePressToken = await freePressToken.getAddress();
    console.log("   ✓ FreePressToken deployed to:", deployedContracts.freePressToken);

    // 2. Deploy AccessManager
    console.log("\n2. Deploying AccessManager...");
    const AccessManager = await hre.ethers.getContractFactory("AccessManager");
    const accessManager = await AccessManager.deploy();
    await accessManager.waitForDeployment();
    deployedContracts.accessManager = await accessManager.getAddress();
    console.log("   ✓ AccessManager deployed to:", deployedContracts.accessManager);

    // 3. Deploy UserRegistry
    console.log("\n3. Deploying UserRegistry...");
    const UserRegistry = await hre.ethers.getContractFactory("UserRegistry");
    const userRegistry = await UserRegistry.deploy(
      deployedContracts.accessManager,
      deployedContracts.freePressToken
    );
    await userRegistry.waitForDeployment();
    deployedContracts.userRegistry = await userRegistry.getAddress();
    console.log("   ✓ UserRegistry deployed to:", deployedContracts.userRegistry);

    // 4. Deploy ProofOfHuman with UserRegistry address
    console.log("\n4. Deploying ProofOfHuman...");
    const ProofOfHuman = await hre.ethers.getContractFactory("ProofOfHuman");
    const proofOfHuman = await ProofOfHuman.deploy(
      hubAddress,
      mockScope,
      verificationConfigId,
      deployedContracts.userRegistry  // Added UserRegistry address here
    );
    await proofOfHuman.waitForDeployment();
    deployedContracts.proofOfHuman = await proofOfHuman.getAddress();
    console.log("   ✓ ProofOfHuman deployed to:", deployedContracts.proofOfHuman);

    // 5. Configure contracts
    console.log("\n5. Configuring contracts...");

    // Authorize contracts in FreePressToken
    console.log("   - Authorizing contracts in FreePressToken...");
    const tx1 = await freePressToken.authorizeContract(deployedContracts.userRegistry);
    await tx1.wait();
    console.log("     ✓ UserRegistry authorized");

    // Authorize contracts in AccessManager
    console.log("   - Authorizing contracts in AccessManager...");
    const tx2 = await accessManager.authorizeContract(deployedContracts.userRegistry);
    await tx2.wait();
    console.log("     ✓ UserRegistry authorized");

    // Set Self verification contract in UserRegistry
    console.log("   - Setting Self verification contract in UserRegistry...");
    const tx3 = await userRegistry.setSelfVerificationContract(deployedContracts.proofOfHuman);
    await tx3.wait();
    console.log("     ✓ ProofOfHuman set as Self verification contract");

    // Wait for confirmations

    // 8. Save deployment info
    console.log("\n8. Saving deployment information...");
    const fs = require("fs");
    const deploymentInfo = {
      network: hre.network.name,
      contracts: {
        freePressToken: deployedContracts.freePressToken,
        accessManager: deployedContracts.accessManager,
        userRegistry: deployedContracts.userRegistry,
        proofOfHuman: deployedContracts.proofOfHuman
      },
      configuration: {
        hubAddress: hubAddress,
        mockScope: mockScope,
        verificationConfigId: verificationConfigId
      },
      deployedAt: new Date().toISOString(),
      deployer: deployer.address
    };

    // Create deployments directory if it doesn't exist
    if (!fs.existsSync("./deployments")) {
      fs.mkdirSync("./deployments");
    }

    fs.writeFileSync(
      "./deployments/latest.json",
      JSON.stringify(deploymentInfo, null, 2)
    );

    // Also save network-specific deployment
    fs.writeFileSync(
      `./deployments/${hre.network.name}.json`,
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("   ✓ Deployment info saved to ./deployments/latest.json");

    // 9. Display summary
    console.log("\n========================================");
    console.log("DEPLOYMENT COMPLETE!");
    console.log("========================================");
    console.log("\nDeployed Contracts:");
    console.log("- FreePressToken:", deployedContracts.freePressToken);
    console.log("- AccessManager:", deployedContracts.accessManager);
    console.log("- UserRegistry:", deployedContracts.userRegistry);
    console.log("- ProofOfHuman:", deployedContracts.proofOfHuman);
    
    console.log("\n⚠️  IMPORTANT NEXT STEPS:");
    console.log("1. Update NEXT_PUBLIC_SELF_ENDPOINT in app/.env with ProofOfHuman address");
    console.log("2. Go to https://tools.self.xyz to generate the correct scope");
    console.log("3. Call proofOfHuman.setScope(newScope) with the generated scope");
    console.log("4. Deploy remaining contracts (ArticleManager, FactVoting, etc.)");
    console.log("5. Authorize remaining contracts in FreePressToken and AccessManager");
    console.log("6. When ready for production, renounce ownerships for decentralization");

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });