import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
  const EasyBet = await ethers.getContractFactory("EasyBet");
  const easyBet = await EasyBet.deploy();
  
  await easyBet.deployed();

  console.log(`EasyBet deployed to ${easyBet.address}`);

  const myERC20 = await easyBet.myERC20();
  console.log(`MyERC20 deployed to ${myERC20}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});