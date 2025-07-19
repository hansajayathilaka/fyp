import { ethers } from "hardhat";

async function main() {
  console.log("Deployment script is ready!");
  console.log("Network:", await ethers.provider.getNetwork());
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());
  
  console.log("✅ Development environment setup complete!");
  console.log("Ready to deploy contracts when they are implemented.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });