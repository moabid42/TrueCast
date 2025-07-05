const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying ArticleManager with the account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

    // For testnet deployment, you might want to use a different staking manager
    // For now, we'll use the deployer as the initial staking manager
    const stakingManagerAddress = deployer.address;

    const ArticleManager = await ethers.getContractFactory("ArticleManager");
    const articleManager = await ArticleManager.deploy(stakingManagerAddress);

    await articleManager.waitForDeployment();

    const contractAddress = await articleManager.getAddress();
    console.log("ArticleManager deployed to:", contractAddress);
    console.log("Staking Manager set to:", stakingManagerAddress);
    console.log("Minimum stake:", await articleManager.minimumStake());

    // Verify deployment
    console.log("\nDeployment verification:");
    console.log("- Contract address:", contractAddress);
    console.log("- Staking Manager:", await articleManager.stakingManager());
    console.log("- Minimum Stake:", ethers.formatEther(await articleManager.minimumStake()), "ETH");
    console.log("- Next Article ID:", await articleManager.nextArticleId());
    console.log("- Total Articles:", await articleManager.getTotalArticles());

    // If you want to verify on Etherscan (for mainnet/testnet)
    if (network.name !== "hardhat" && network.name !== "localhost") {
        console.log("\nWaiting for block confirmations...");
        await articleManager.deploymentTransaction().wait(6);

        console.log("\nVerifying contract on Etherscan...");
        try {
            await run("verify:verify", {
                address: contractAddress,
                constructorArguments: [stakingManagerAddress],
            });
            console.log("Contract verified successfully!");
        } catch (error) {
            console.log("Error verifying contract:", error.message);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
