import { Button, Table, Modal, Radio, InputNumber, Form, message, Input, DatePicker, Divider } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import { web3, easyBetContract, myERC20Contract, initializeWeb3, isInitialized } from "../../utils/contracts";
import './index.css';


const GanacheTestChainId = '0x539' // Ganache默认的ChainId = 0x539 = Hex(1337)
// TODO change according to your configuration
const GanacheTestChainName = 'Ganache Test Chain'
const GanacheTestChainRpcUrl = 'http://127.0.0.1:8545'

interface Lottery {
  key: number;
  name: string;
  participants: number;
  prizePool: number;
  endTime: number;
  choices: string[];
  rightChoice?: string;
}

interface Ticket {
  key: number
  lotteryId: number;
  choice: string;
  owner: string;
  amount: number;
  price: number;
}

const LotteryPage: React.FC = () => {
  const [account, setAccount] = useState<string>('');
  const [balance, setBalance] = useState<number>(0);
  const [lotteries, setLotteries] = useState<Lottery[]>([]);

  const activeLotteries = lotteries.filter(lottery => lottery.endTime > Date.now());

  const [tickets, setTickets] = useState<Ticket[]>([]);

  const sellingTickets = tickets.filter(ticket => ticket.price > 0 && ((ticket.owner ?? '').toLowerCase() !== (account ?? '').toLowerCase()));
  const myTickets = tickets.filter(ticket => ((ticket.owner ?? '').toLowerCase() === (account ?? '').toLowerCase()));

  const [isManager, setIsManager] = useState(true);

  const [currentLottery, setCurrentLottery] = useState<Lottery | null>(null);
  const onClickConnectWallet = async () => {
        // 查看window对象里是否存在ethereum（metamask安装后注入的）对象
        // @ts-ignore
        const {ethereum} = window;
        if (!Boolean(ethereum && ethereum.isMetaMask)) {
            alert('MetaMask is not installed!');
            return
        }        try {
            // 如果当前小狐狸不在本地链上，切换Metamask到本地测试链
            if (ethereum.chainId !== GanacheTestChainId) {
                const chain = {
                    chainId: GanacheTestChainId, // Chain-ID
                    chainName: GanacheTestChainName, // Chain-Name
                    rpcUrls: [GanacheTestChainRpcUrl], // RPC-URL
                    nativeCurrency: {
                        name: 'Ether',
                        symbol: 'ZJU',
                        decimals: 18
                    }
                };

                try {
                    // 尝试切换到本地网络
                    await ethereum.request({method: "wallet_switchEthereumChain", params: [{chainId: chain.chainId}]})
                } catch (switchError: any) {
                    // 如果本地网络没有添加到Metamask中，添加该网络
                    if (switchError.code === 4902) {
                        await ethereum.request({ method: 'wallet_addEthereumChain', params: [chain]
                        });
                    }
                }
            }            // 小狐狸成功切换网络了，接下来让小狐狸请求用户的授权
            await ethereum.request({method: 'eth_requestAccounts'});
            
            // 初始化web3和合约实例
            initializeWeb3();
            
            // 获取小狐狸拿到的授权用户列表
            const accounts = await ethereum.request({method: 'eth_accounts'});
            // 如果用户存在，展示其account，否则显示错误信息
            setAccount(accounts[0] || 'Not able to get accounts');
            
            // 连接成功后自动刷新数据
            setTimeout(() => {
                refreshData();
            }, 1000); // 延迟1秒确保合约初始化完成
        } catch (error: any) {
            alert(error.message)
        }
  };
  
  const onClickTokenAirdrop = async () => {
      if(account === '') {
            alert('You have not connected wallet yet.')
            return
        }

        if (myERC20Contract) {
            try {
                await myERC20Contract.methods.airdrop().send({
                    from: account
                })
                alert('You have claimed ZJU Token.')
                await refreshData();
            } catch (error: any) {
                alert(error.message)
            }

        } else {
            alert('Contract not exists.')
        }
    }
    // 数据刷新函数 - 从智能合约获取最新数据
  const refreshData = async () => {
    if (!account) {
      console.log('账户未连接');
      return;
    }
    
    if (!isInitialized()) {
      console.log('合约未初始化，请先连接钱包');
      return;
    }

    try {
        // 1. 获取账户余额
      const balance = await myERC20Contract.methods.balanceOf(account).call() as any;
      setBalance(Number(balance));
      
      // 2. 检查是否为管理员
      try {
        const manager = await easyBetContract.methods.manager().call() as any;
        setIsManager(manager.toLowerCase() === account.toLowerCase());
      } catch (error) {
        console.log('获取管理员信息失败:', error);
        setIsManager(false);
      }
      
      // 3. 获取竞赛数量和竞赛列表
      let lotteriesData: Lottery[] = [];
      try {
        const lotteriesInfo = await easyBetContract.methods.getLotteries().call() as any;
        for (let i = 0; i < lotteriesInfo.length; i++) {
          const lottery = lotteriesInfo[i];
          if (lottery.name && lottery.name.trim() !== '') {            lotteriesData.push({
              key: i + 1, // 使用数组索引+1作为key
              name: lottery.name,
              participants: parseInt(lottery.participants) || 0,
              prizePool: lottery.prizePool, 
              endTime: parseInt(lottery.endTime) * 1000, // 转换为毫秒
              choices: lottery.choices || [],
              rightChoice: lottery.rightChoice || ''
            });
          }
        }
        setLotteries(lotteriesData);
      } catch (error) {
        console.log('获取竞赛列表失败:', error);
      }
      
      // 4. 获取彩票
      try {
        const ticketsInfo = await easyBetContract.methods.getTickets().call() as any;
        const ticketsData: Ticket[] = [];
        const TicketsInfo = ticketsInfo[0]; // 第一个返回值是 Ticket 数组
        const ticketsTokens = ticketsInfo[1];// 第二个返回值是 tokenId 数组
        const ticketsOwners = ticketsInfo[2];// 第三个返回值是 owner 数组
        for (let i = 0; i < TicketsInfo.length; i++) {
          const ticket = TicketsInfo[i];
          const owner = ticketsOwners[i];
          const tokenId = ticketsTokens[i];

          // 根据lotteryId找到对应的竞赛
          const lotteryId = parseInt(ticket.lotteryId);
          const lottery = lotteriesData.find((l: Lottery) => l.key === lotteryId);
          if (lottery) {
            const ticketData: Ticket = {
              key: tokenId, // 使用实际的tokenId作为key
              lotteryId: lottery.key,
              choice: ticket.choice,
              owner: owner,
              amount: ticket.amount,
              price: ticket.isSelling ? ticket.sellPrice : 0
            };
            ticketsData.push(ticketData);
          }
        }
        setTickets(ticketsData);
      } catch (error) {
        console.log('获取彩票列表失败:', error);
      }

      console.log('数据刷新完成');
    } catch (error) {
      console.error('刷新数据时发生错误:', error);
      message.error('刷新数据失败，请检查网络连接');
    }
  };


  /*
  ---------------------------------------------------------------------
  用户新建彩票
  ---------------------------------------------------------------------
  */ 
  const [playModalVisible, setPlayModalVisible] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [inputAmount, setInputAmount] = useState<number | null>(null);

  // 当用户点击表格中的 “参与” 按钮时弹出对话框
  const openPlayModal = async (record: Lottery) => {
    // 初始化 modal 的状态
    setCurrentLottery(record);
    // 使用 record.choices（如果存在）或 fallback choices
    const initialChoice = (record.choices && record.choices.length > 0) ? record.choices[0] : 'Choice A';
    setSelectedChoice(initialChoice);
    setInputAmount(0);
    setPlayModalVisible(true);
  };
  const playOk = async () => {
    if (!currentLottery) {
      message.error('没有选定的抽奖项');
      return;
    }
    if (!selectedChoice) {
      message.error('请先选择一个选项');
      return;
    }
    if (inputAmount === null || inputAmount <= 0) {
      message.error('请输入合法的金额（大于 0）');
      return;
    }

    if (!isInitialized()) {
      message.error('合约未初始化，请先连接钱包');
      return;
    }    try {
      // 检查用户余额是否足够
      const userBalance = await myERC20Contract.methods.balanceOf(account).call();
      if (web3.utils.toBN(userBalance).lt(web3.utils.toBN(inputAmount))) {
        message.error('ZJU Token 余额不足');
        return;
      }
      const easyBetAddress = easyBetContract.options.address;
      const allowance = await myERC20Contract.methods.allowance(account, easyBetAddress).call();
      if (web3.utils.toBN(allowance).lt(web3.utils.toBN(inputAmount))) {
      // 先批准合约花费
      await myERC20Contract.methods.approve(easyBetAddress, inputAmount).send({ from: account });
      }

      // 调用buyTicket合约方法
      await easyBetContract.methods.buyTicket(currentLottery.key, selectedChoice, inputAmount).send({
        from: account
      });

      message.success('彩票购买成功！');

      // 刷新数据以获取最新状态
      await refreshData();
      
      setPlayModalVisible(false);
      // 重置 modal 状态
      setCurrentLottery(null);
      setSelectedChoice(null);
      setInputAmount(null);
    } catch (error: any) {
      console.error('投注失败:', error);
      
      // 更详细的错误处理
      let errorMessage = '投注失败';
      if (error.message) {
        if (error.message.includes('insufficient funds')) {
          errorMessage = 'ETH 余额不足，无法支付 Gas 费用';
        } else if (error.message.includes('Transfer failed')) {
          errorMessage = 'ZJU Token 转账失败，请检查余额和授权';
        } else if (error.message.includes('User denied')) {
          errorMessage = '用户取消了交易';
        } else {
          errorMessage = `投注失败: ${error.message}`;
        }
      }
      
      message.error(errorMessage);
    }
  };

  const playCancel = () => {
    setPlayModalVisible(false);
    setCurrentLottery(null);
    setSelectedChoice(null);
    setInputAmount(null);
  };


    const lotteryColumns: ColumnsType<Lottery> = [
    { title: '竞赛项目', dataIndex: 'name', key: 'name' },
    { title: '参加总人数', dataIndex: 'participants', key: 'participants' },
    { title: '奖池总金额', dataIndex: 'prizePool', key: 'prizePool' },
    {
      title: '结束时间', dataIndex: 'endTime', key: 'endTime',
      render: (endTime: number) => new Date(endTime).toLocaleString()
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) =>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="primary" onClick={() => openPlayModal(record)} disabled={isManager}>参与</Button>
          <Button type="primary" onClick={() => openBuyModal(record)} disabled={isManager}>交易</Button>
          {isManager && (
              <Button type="primary" onClick={() => openResultModal(record)} disabled={record.rightChoice !== ''}>选择结果</Button>
          )}
        </div>
    },
  ];

  /*
  ----------------------------------------------------------------
  sellModal (用户出售彩票)
  ---------------------------------------------------------------------
  */
  const [sellModalVisible, setSellModalVisible] = useState(false);
  const [selectedSellTicket, setSelectedSellTicket] = useState<Ticket | null>(null);
  const [sellPrice, setSellPrice] = useState<number | null>(null);
  const openSellModal = async (ticket: Ticket) => {
    setSelectedSellTicket(ticket);
    // 如果票据未出售(price为0)，则不设置初始价格
    setSellPrice(null);
    setSellModalVisible(true);
  };
  const sellOk = async () => {
    if (!selectedSellTicket) {
      message.error('没有选定的票据');
      return;
    }
    if (!sellPrice || sellPrice <= 0) {
      message.error('请输入合法的价格（大于 0）');
      return;
    }
    if (!account) {
      message.error('请先连接钱包');
      return;
    }
    try {
        // 调用sellTicket合约方法
        await easyBetContract.methods.sellTicket(selectedSellTicket.key, sellPrice).send({
          from: account
        });
        
        message.success('彩票已成功上架出售！');
        
        // 刷新数据以获取最新状态
        await refreshData();
      }  catch (error: any) {
      console.error('出售失败:', error);
      message.error(`出售失败: ${error.message || '未知错误'}`);
    }

    setSellModalVisible(false);
    setSelectedSellTicket(null);
    setSellPrice(null);
  };

  const sellCancel = () => {
    setSellModalVisible(false);
    setSelectedSellTicket(null);
    setSellPrice(null);
  };

  const onClickStopSell = async (record: Ticket) => {
    if (!account) {
      message.error('请先连接钱包');
      return;
    }
    try {
        // 调用stopSellingTicket合约方法
        await easyBetContract.methods.removeTicketFromSale(record.key).send({
          from: account
        });
        message.success('彩票已成功取消出售！');
        // 刷新数据以获取最新状态
        await refreshData();
      }  catch (error: any) {
      console.error('取消出售失败:', error);
      message.error(`取消出售失败: ${error.message || '未知错误'}`);
    }
  }
  const isTicketLotteryEnd = (record: Ticket) => {
    const matched = lotteries.find(l => l.key === record.lotteryId);
    return matched ? matched.endTime < Date.now() : false;
  };  const myTicketsColumn = [
    { 
      title: 'Lottery', 
      dataIndex: 'lotteryId', 
      key: 'lottery',
      render: (lotteryId: number) => {
        const lottery = lotteries.find(l => l.key === lotteryId);
        return lottery ? lottery.name : '未知竞赛';
      }
    },
    { title: 'Choice', dataIndex: 'choice', key: 'choice' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount' },
    { 
      title: 'Price', 
      dataIndex: 'price', 
      key: 'price', 
      render: (text: any) => {
        if (text === null || text === 0) {
          return '未出售';
        } else {
          return `${text} `;
        }
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Ticket) => (
        <div>
          {isTicketLotteryEnd(record) ? (
            <span>抽奖已结束，无法出售</span>
          ) : (
            <div>
              票据状态: {record.price === 0 ? '未出售' : '出售中'}
              {record.price === 0 && (
            <Button
              type="primary"
              onClick={() => openSellModal(record)}
              style={{ marginLeft: 8 }}
            >
              出售
            </Button>
          )}
          {record.price > 0 && (
            <Button
              type="primary"
              onClick={() => onClickStopSell(record)}
              style={{ marginLeft: 8 }}
            >
              取消出售
            </Button>
          )}
            </div>
          )}
        </div>
      ),
    },
  ];

  /*
  ---------------------------------------------------------------
  buyModal (用户交易彩票)
  ---------------------------------------------------------------
  */ 
  const [buyModalVisible, setBuyModalVisible] = useState(false);
  const [selectedBuyChoice, setSelectedBuyChoice] = useState<string | null>(null);

  // 打开交易对话框：设置当前抽奖和默认选项，显示 modal
  const openBuyModal = async (record: Lottery) => {
    setCurrentLottery(record);
    const initial = (record.choices && record.choices.length > 0) ? record.choices[0] : null;
    setSelectedBuyChoice(initial);
    setBuyModalVisible(true);
  };

  const onClickBuy = async (record: Ticket) => {
    if (!account) {
      message.error('请先连接钱包');
      return;
    }
    try {   
      const easyBetAddress = easyBetContract.options.address;
      const allowance = await myERC20Contract.methods.allowance(account, easyBetAddress).call();
      if (web3.utils.toBN(allowance).lt(web3.utils.toBN(record.price))) {
      // 先批准合约花费
      await myERC20Contract.methods.approve(easyBetAddress, record.price).send({ from: account });
      }  
      // 调用buySecondhandTicket合约方法
        await easyBetContract.methods.buySecondhandTicket(record.key).send({
          from: account
        });

        message.success('彩票已成功购买！');

        // 刷新数据以获取最新状态
        await refreshData();
      }  catch (error: any) {
      console.error('购买失败:', error);
      message.error(`购买失败: ${error.message || '未知错误'}`);
    }
    setBuyModalVisible(false);
    setSelectedBuyChoice(null);
    setCurrentLottery(null);
  };
  // 购买 modal 中 tickets 表格的列定义
  const ticketColumns = [
    { 
      title: 'Lottery', 
      dataIndex: 'lotteryId', 
      key: 'lottery',
      render: (lotteryId: number) => {
        const lottery = lotteries.find(l => l.key === lotteryId);
        return lottery ? lottery.name : '未知竞赛';
      }
    },
    { title: 'Choice', dataIndex: 'choice', key: 'choice' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount' },
    { title: 'Price', dataIndex: 'price', key: 'price' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Ticket) => (
        <Button
          type="primary"
          onClick={() => onClickBuy(record)}
        >
          购买
        </Button>
      ),
    },
  ];

  // 根据当前选中的 choice 过滤 tickets（只显示与当前抽奖和选项匹配的 ticket）
  const filteredTickets = currentLottery && selectedBuyChoice
    ? sellingTickets.filter(t => t.lotteryId === currentLottery.key && t.choice === selectedBuyChoice)
    : [];

  /*
  ----------------------------------------------------------------------------
  管理员创建新竞赛
  ----------------------------------------------------------------------------
  */
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [lotteryName, setLotteryName] = useState<string>('');
  const [lotteryChoices, setLotteryChoices] = useState<string[]>(['', '']);
  const [lotteryEndTime, setLotteryEndTime] = useState<number>(0);

  const openCreateModal = () => {
    setLotteryName('');
    setLotteryChoices(['', '']);
    setLotteryEndTime(0);
    setCreateModalVisible(true);
  };

  const createOk = async () => {
    try {
      if (!lotteryName) {
        message.error('请填写标题（name）');
        return;
      }
      if (!Array.isArray(lotteryChoices) || lotteryChoices.length < 2) {
        message.error('请至少设置两个有效的选项');
        return;
      }
      if (!lotteryEndTime) {
        message.error('请设置结束时间');
        return;
      }
      // 调用createLottery合约方法
      await easyBetContract.methods.createLottery(lotteryName, lotteryEndTime, lotteryChoices).send({
        from: account
      });
        
      message.success('竞赛创建成功！');
        
      // 刷新数据以获取最新状态
      await refreshData();
      setCreateModalVisible(false);
    } catch (err: any) {
      // validateFields 抛出时会触发到这里（校验失败），无需额外处理
      console.error(err);
    }
  };

  const createCancel = () => {
    setCreateModalVisible(false);
    setLotteryName('');
    setLotteryChoices(['', '']);
    setLotteryEndTime(0);
  };

  /*
  ----------------------------------------------------------------------------
  管理员选择结果
  ----------------------------------------------------------------------------
  */
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [selectedResultChoice, setSelectedResultChoice] = useState<string | null>(null);

  // 打开结果输入对话框（管理员）
  const openResultModal = async (record: Lottery) => {
    setCurrentLottery(record);
    const initial = (record.choices && record.choices.length > 0) ? record.choices[0] : null;
    setSelectedResultChoice(initial);
    setResultModalVisible(true);
  };  const chooseOk = async () => {
          if (!currentLottery) {
            message.error('没有选定的抽奖项');
            return;
          }
          if (!selectedResultChoice) {
            message.error('请先选择一个选项');
            return;
          }
          
          try {
            console.log('开始设置结果...');
            console.log('竞赛ID:', currentLottery.key);
            console.log('选择的结果:', selectedResultChoice);
            console.log('奖池金额:', currentLottery.prizePool);
            
            // 检查合约代币余额和管理员余额
            const easyBetAddress = easyBetContract.options.address;
            const contractBalance = await myERC20Contract.methods.balanceOf(easyBetAddress).call();
            const managerBalance = await myERC20Contract.methods.balanceOf(account).call();
            const managerAllowance = await myERC20Contract.methods.allowance(account, easyBetAddress).call();
            
            console.log('合约代币余额:', contractBalance);
            console.log('管理员代币余额:', managerBalance);
              
            // 检查授权是否足够，如果不够则先授权
            if (web3.utils.toBN(managerAllowance).lt(web3.utils.toBN(currentLottery.prizePool))) {
              console.log('需要先授权代币给合约');
              await myERC20Contract.methods.approve(easyBetAddress, currentLottery.prizePool).send({ from: account });
              console.log('授权完成');
            }
            
            // 调用 closeLottery
            await easyBetContract.methods.closeLottery(currentLottery.key, selectedResultChoice).send({ from: account });
            message.success('结果已提交成功！');

            await refreshData();
            setResultModalVisible(false);
            setCurrentLottery(null);
            setSelectedResultChoice(null);
          } catch (error: any) {
            console.error('选择结果失败:', error);
          }
        };

  const chooseCancel = () => {
          setResultModalVisible(false);
          setCurrentLottery(null);
          setSelectedResultChoice(null);
        }

  return (
    <div className='main'>
      <h1>Lottery DApp</h1>      <div className='header'>
        <div>当前账户为：{account}</div>
        <div>ZJU Token 余额为：{balance}</div>
        {account === '' &&(
           <Button type="primary" onClick={onClickConnectWallet}>连接钱包</Button> 
        )}        
        {!(account === '') &&(
            <div>
                <Button type="primary" onClick={onClickTokenAirdrop}>领取空投</Button>
                <Divider type="vertical" />
                <Button type="primary" onClick={refreshData}>刷新数据</Button>
            </div>
        )}
      </div>

      <Table<Lottery>
        columns={lotteryColumns}
        dataSource={isManager?lotteries:activeLotteries}
        pagination={false}
        rowKey="key"
        title={() => '当前进行的竞赛'}
      />
      <Table<Ticket>
        columns={myTicketsColumn}
        dataSource={myTickets}
        pagination={false}
        rowKey="key"
        title={() => '我的彩票'}
      />

      {isManager && (
        <div style={{ marginTop: 12 }}>
          <div>你的身份为管理员可以创建新抽奖</div>
          <Button type="primary" style={{ marginTop: 8 }} onClick={openCreateModal}>创建新抽奖</Button>
        </div>
      )}      <Modal
        title={currentLottery ? `参与：${currentLottery.name}` : '参与抽奖'}
        open={playModalVisible}
        onOk={playOk}
        onCancel={playCancel}
        okText="确定"
        cancelText="取消"
        destroyOnHidden
      >
        <Form layout="vertical">
          <Form.Item label="请选择一个选项" required>
            <Radio.Group
              value={selectedChoice}
              onChange={(e) => setSelectedChoice(e.target.value)}
            >
              {(currentLottery?.choices && currentLottery.choices.length > 0 ? currentLottery.choices : ['Choice A', 'Choice B']).map((c) => (
                <Radio key={c} value={c} style={{ display: 'block', margin: '6px 0' }}>{c}</Radio>
              ))}
            </Radio.Group>
          </Form.Item>

          <Form.Item label="请输入金额（整数）" required>
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              value={inputAmount ?? undefined}
              onChange={(val) => setInputAmount(Number(val ?? 0))}
            />
          </Form.Item>
        </Form>
      </Modal>      {/* 出售 Modal (用户)*/}
      <Modal
        title="出售彩票"
        open={sellModalVisible}
        onOk={sellOk}
        onCancel={sellCancel}
        okText="确定"
        cancelText="取消"
        destroyOnHidden
      >        <div>当前出售的票据：</div>        <div>
          {selectedSellTicket && (
            <div>
              <p>票据ID: {selectedSellTicket.key}</p>
              <p>竞赛名称: {lotteries.find(l => l.key === selectedSellTicket.lotteryId)?.name || '未知竞赛'}</p>
              <p>彩票选择: {selectedSellTicket.choice}</p>
              <p>彩票金额: {selectedSellTicket.amount}</p>
              <p>当前状态: {selectedSellTicket.price > 0 ? '出售中' : '未出售'}</p>
            </div>
          )}
        </div>
        <Form layout="vertical">          <Form.Item label="请输入出售价格 " required>
            <InputNumber
              min={0.001}
              step={0.001}
              style={{ width: '100%' }}
              value={sellPrice ?? undefined}
              onChange={(val) => setSellPrice(Number(val ?? 0))}
              placeholder="输入价格，如: 0.1"
            />
          </Form.Item>
        </Form>
      </Modal>      {/* 购买 Modal (用户)*/}
      <Modal
        title={currentLottery ? `购买彩票：${currentLottery.name}` : '购买彩票'}
        open={buyModalVisible}
        okText="确定"
        cancelText="取消"
        destroyOnHidden
      >
        {/* 顶部：显示当前竞赛的所有选项（Radio，用户只能选中一个） */}
        <Form layout="vertical">
          <Form.Item label="请选择要查看/购买的选项" required>
            <Radio.Group
              value={selectedBuyChoice}
              onChange={(e) => setSelectedBuyChoice(e.target.value)}
            >
              {(currentLottery?.choices && currentLottery.choices.length > 0 ? currentLottery.choices : []).map((c) => (
                <Radio key={c} value={c} style={{ display: 'inline-block', marginRight: 12 }}>{c}</Radio>
              ))}
            </Radio.Group>
          </Form.Item>

          {/* 下方表格：显示所有与该选项匹配的 tickets，并为每行提供购买按钮 */}
          <Form.Item label="可购买的 Tickets">
            <Table<Ticket>
              columns={ticketColumns}
              dataSource={filteredTickets}
              pagination={false}
              rowKey={(rec) => rec.key.toString()}
              locale={{ emptyText: '无可购买的 ticket' }}
              size="small"
            />
          </Form.Item>
        </Form>
        <Button type="primary" onClick={() => setBuyModalVisible(false)}>退出</Button>
      </Modal>       {/* 创建新竞赛 Modal (管理员)*/}
      <Modal
        title="创建新竞赛"
        open={createModalVisible}
        onOk={createOk}
        onCancel={createCancel}
        okText="确定"
        cancelText="取消"
        destroyOnHidden
      >
        <Form layout="vertical">
          <Form.Item
        label="标题（name）"
        required
          >
        <Input
          placeholder="输入竞赛标题"
          value={lotteryName}
          onChange={(e) => setLotteryName(e.target.value)}
        />
          </Form.Item>

          <Form.Item label="选项（至少两个）" required>
        {lotteryChoices.map((choice, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <Input
          placeholder={`选项 ${idx + 1}`}
          value={choice}
          onChange={(e) => {
            const newChoices = [...lotteryChoices];
            newChoices[idx] = e.target.value;
            setLotteryChoices(newChoices);
          }}
          style={{ flex: 1 }}
            />
            {lotteryChoices.length > 2 && (
          <Button
            type="link"
            onClick={() => {
              const newChoices = lotteryChoices.filter((_, i) => i !== idx);
              setLotteryChoices(newChoices);
            }}
            style={{ marginLeft: 8 }}
          >
            删除
          </Button>
            )}
          </div>
        ))}

        <Button
          type="dashed"
          onClick={() => setLotteryChoices([...lotteryChoices, ''])}
          style={{ width: '100%' }}
        >
          添加选项
        </Button>
          </Form.Item>

          <Form.Item label="结束时间" required>
        <DatePicker
          showTime
          style={{ width: '100%' }}
          onChange={(date: any) => {
            // 存储为秒级 unix 时间戳，createOk 中会校验其存在
            if (date) {
          setLotteryEndTime(Math.floor(date.valueOf() / 1000));
            } else {
          setLotteryEndTime(0);
            }
          }}
        />
          </Form.Item>
        </Form>
      </Modal>      {/* 选择结果 Modal（管理员） */}
      <Modal
        title={currentLottery ? `选择结果：${currentLottery.name}` : '选择结果'}
        open={resultModalVisible}
        onOk={chooseOk}
        onCancel={chooseCancel}
        okText="确定"
        cancelText="取消"
        destroyOnHidden
      >
        <Form layout="vertical">
          <Form.Item label="请选择最终结果（只能选中一个）" required>
            <Radio.Group
              value={selectedResultChoice}
              onChange={(e) => setSelectedResultChoice(e.target.value)}
            >
              {(currentLottery?.choices && currentLottery.choices.length > 0 ? currentLottery.choices : []).map((c) => (
                <Radio key={c} value={c} style={{ display: 'block', margin: '6px 0' }}>{c}</Radio>
              ))}
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>

      
    </div>
  );
};

export default LotteryPage;