const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying JournalistApplication contract...");

  const JournalistApplication = await ethers.getContractFactory("JournalistApplication");
  const journalistApplication = await JournalistApplication.deploy();

  await journalistApplication.waitForDeployment();
  const address = await journalistApplication.getAddress();

  console.log("JournalistApplication deployed to:", address);

  // Verify the deployment
  console.log("Verifying deployment...");
  const deployedContract = await ethers.getContractAt("JournalistApplication", address);
  
  const owner = await deployedContract.owner();
  console.log("Contract owner:", owner);
  
  const deployer = (await ethers.getSigners())[0];
  const isAdmin = await deployedContract.isAdmin(deployer.address);
  console.log("Deployer is admin:", isAdmin);

  console.log("JournalistApplication deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 