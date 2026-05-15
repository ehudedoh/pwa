import { readFileSync } from 'fs';
import { ethers } from 'ethers';

function readEnv(){
  try{
    const data = readFileSync('.env','utf8');
    const lines = data.split(/\r?\n/);
    const map = {};
    for(const l of lines){
      const t = l.trim(); if(!t||t.startsWith('#')) continue;
      const i = t.indexOf('='); if(i===-1) continue;
      const k = t.slice(0,i).trim(), v = t.slice(i+1).trim(); map[k]=v;
    }
    return map;
  }catch(e){return process.env;}
}

const env = readEnv();
const RPC = process.env.RPC_URL || env.NEXT_PUBLIC_POLYGON_RPC_URL || env.RPC_URL || 'https://polygon-rpc.com';
const ADDR = process.env.CONTRACT_ADDRESS || env.NEXT_PUBLIC_CONTRACT_ADDRESS || env.CONTRACT_ADDRESS || '';

async function main(){
  console.log('Using RPC:', RPC);
  console.log('Checking address:', ADDR);
  if(!ADDR){
    console.error('No contract address provided');
    process.exit(2);
  }
  const provider = new ethers.JsonRpcProvider(RPC);
  const code = await provider.getCode(ADDR);
  console.log('bytecode length:', code.length);
  if(code && code !== '0x' && code !== '0x0'){
    console.log('Contract appears deployed at', ADDR);
  } else {
    console.log('No bytecode at address. Not deployed or wrong address.');
  }
}

main().catch(e=>{console.error(e);process.exit(1);});
