import Addresses from './contract-addresses.json'
import EasyBet from './abis/EasyBet.json'
import MyERC20 from './abis/MyERC20.json'

const Web3 = require('web3');

// 修改地址为部署的合约地址
const easyBetAddress = Addresses.EasyBet
const easyBetABI = EasyBet.abi
const myERC20Address = Addresses.MyERC20
const myERC20ABI = MyERC20.abi

// 延迟初始化web3实例和合约，避免在window.ethereum未就绪时初始化
let web3: any = null;
let easyBetContract: any = null;
let myERC20Contract: any = null;

// 初始化web3和合约的函数
const initializeWeb3 = () => {
  // @ts-ignore
  if (typeof window !== 'undefined' && window.ethereum && !web3) {
    // @ts-ignore
    web3 = new Web3(window.ethereum);
    easyBetContract = new web3.eth.Contract(easyBetABI, easyBetAddress);
    myERC20Contract = new web3.eth.Contract(myERC20ABI, myERC20Address);
  }
};

// 检查是否已初始化
const isInitialized = () => {
  return web3 !== null && easyBetContract !== null && myERC20Contract !== null;
};

// 导出web3实例和其它部署的合约
export {
  web3,
  easyBetContract,
  myERC20Contract,
  initializeWeb3,
  isInitialized
}