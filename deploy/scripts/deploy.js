const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with', deployer.address);

  const ChainCacao = await ethers.getContractFactory('ChainCacao');
  const contract = await ChainCacao.deploy();
  await contract.deployed();

  console.log('ChainCacao deployed to:', contract.address);

  // write address and ABI to ../public/js/runtime-config.js or files
  const out = {
    address: contract.address
  };

  const publicDir = path.resolve(__dirname, '..', '..', 'public', 'js');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  // Save deployed address
  fs.writeFileSync(path.join(publicDir, 'deployed-contract.json'), JSON.stringify({ address: contract.address }, null, 2));

  // Save ABI
  const abi = contract.interface.format(ethers.utils.FormatTypes.json);
  fs.writeFileSync(path.join(publicDir, 'deployed-abi.json'), abi);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
