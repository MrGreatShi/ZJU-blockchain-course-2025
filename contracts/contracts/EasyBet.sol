// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./MyERC20.sol";

contract EasyBet is ERC721 {
    address public manager;
    MyERC20 public myERC20;
    uint256 public nextTokenId = 1;
    uint256 public nextLotteryId = 1;
    uint256 public ticketPrice = 1;

    struct Lottery{
        string name;
        uint256 participants;
        uint256 prizePool;
        uint256 endTime;
        string[] choices;
        string rightChoice;
    }

    struct Ticket {
        uint256 lotteryId;
        string choice;
        uint256 amount;
        uint256 sellPrice;
        bool isSelling;
    }
    
    mapping(uint256 => Lottery) public lotteries;
    mapping(uint256 => Ticket) public tickets;    
    event LotteryCreated(uint256 indexed lotteryId, string name, uint256 endTime);
    event TicketCreated(uint256 indexed tokenId, uint256 indexed lotteryId, string choice, uint256 amount, address owner);
    event TicketListedForSale(uint256 indexed tokenId, address indexed seller, uint256 price);
    event TicketSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price);
    event LotteryResultSet(uint256 indexed lotteryId, string winningChoice);
    event LotteryClosed(uint256 indexed lotteryId);

    modifier onlyManager() {
        require(msg.sender == manager, "Only manager");
        _;
    }
        
    constructor() ERC721("EasyBet Lottery Ticket", "EBLT") {
        myERC20 = new MyERC20("ZJUToken", "ZJU");
        manager = msg.sender;
    }    

    function airdrop() public{
        myERC20.airdrop();
    }
    // 获取所有竞赛
    function getLotteries() public view returns (Lottery[] memory) {
        Lottery[] memory list = new Lottery[](nextLotteryId - 1);
        for (uint256 i = 0; i < list.length; i++) {
            list[i] = lotteries[i + 1];
        }
        return list;
    }

    // 获取所有出售中的彩票
    function getTickets() public view returns (Ticket[] memory,uint256[] memory tokenIds, address[] memory owners) {
        Ticket[] memory list = new Ticket[](nextTokenId - 1);
        address[] memory ticketOwners = new address[](nextTokenId - 1);
        uint256[] memory ticketsTokenIds = new uint256[](nextTokenId - 1);
        for (uint256 i = 1; i < nextTokenId; i++) {
            list[i - 1] = tickets[i];
            ticketsTokenIds[i - 1] = i;
            ticketOwners[i - 1] = ownerOf(i);
        }
        return (list, ticketsTokenIds, ticketOwners);
    }

    // 创建竞彩活动（只有管理员可以调用）
    function createLottery(string memory name, uint256 endTime, string[] memory choices) public onlyManager {
        require(endTime > block.timestamp, "Invalid end time");
        require(choices.length >= 2, "Need 2+ choices");
        require(bytes(name).length > 0, "Empty name");

        uint256 lotteryId = nextLotteryId++;
        
        Lottery storage newLottery = lotteries[lotteryId];
        newLottery.name = name;
        newLottery.endTime = endTime;
        newLottery.participants = 0;
        newLottery.prizePool = 0;
        newLottery.choices = choices;
        newLottery.rightChoice = "";

        emit LotteryCreated(lotteryId, name, endTime);
    }      
    
    // 购买彩票功能 - 使用 ERC20 代币支付
    function buyTicket(uint256 lotteryId, string memory choice, uint256 amount) public {
        require(amount > 0, "Amount > 0");

        require(myERC20.transferFrom(msg.sender, manager, amount), "Transfer failed");

        uint256 tokenId = nextTokenId++;
        
        Ticket storage newTicket = tickets[tokenId];   
        newTicket.lotteryId = lotteryId;
        newTicket.choice = choice;
        newTicket.amount = amount;
        newTicket.sellPrice = 0;
        newTicket.isSelling = false;

        lotteries[lotteryId].participants++;
        lotteries[lotteryId].prizePool += amount;

        _safeMint(msg.sender, tokenId);

        emit TicketCreated(tokenId, lotteryId, choice, amount, msg.sender);
    }      
    
    // 出售彩票功能
    function sellTicket(uint256 tokenId, uint256 price) public {
        require(ownerOf(tokenId) == msg.sender, "Only owner can sell ticket");
        require(!tickets[tokenId].isSelling, "Ticket is already listed for sale");
        require(price > 0, "Price must be greater than 0");

        tickets[tokenId].isSelling = true;
        tickets[tokenId].sellPrice = price; 

        emit TicketListedForSale(tokenId, msg.sender, price);
    }    
    
    // 取消出售彩票
    function removeTicketFromSale(uint256 tokenId) public {
        require(ownerOf(tokenId) == msg.sender, "Only owner can remove ticket from sale");
        require(tickets[tokenId].isSelling, "Ticket is not for sale");

        tickets[tokenId].isSelling = false;
        tickets[tokenId].sellPrice = 0;
    }      
    
    // 购买二手彩票功能
    function buySecondhandTicket(uint256 tokenId) public {
        require(tickets[tokenId].isSelling, "Ticket is not for sale");
        require(ownerOf(tokenId) != msg.sender, "Cannot buy your own ticket");

        address seller = ownerOf(tokenId);
        uint256 salePrice = tickets[tokenId].sellPrice;
        
        require(myERC20.transferFrom(msg.sender, seller, salePrice), "Token transfer failed");
        
        tickets[tokenId].sellPrice = 0;
        tickets[tokenId].isSelling = false;
        
        _transfer(seller, msg.sender, tokenId);

        emit TicketSold(tokenId, seller, msg.sender, salePrice);
    }

    // 关闭竞彩并分发奖励（只有管理员可以调用）
    function closeLottery(uint256 lotteryId, string memory rightChoice) public onlyManager {

        lotteries[lotteryId].rightChoice = rightChoice;
        // 为方便调试，设置竞彩结束时间为当前时间
        lotteries[lotteryId].endTime = block.timestamp;

        Lottery storage lottery = lotteries[lotteryId];
        uint256[] memory winnerTokenIds = new uint256[](lottery.participants);
        uint256 winnerCount = 0;
        uint256 totalWinningAmount = 0;

        // 收集所有获胜的彩票
        for (uint256 i = 1; i < nextTokenId; i++) {
            if (tickets[i].lotteryId == lotteryId && keccak256(bytes(tickets[i].choice)) == keccak256(bytes(lottery.rightChoice))) {
                winnerTokenIds[winnerCount] = i;
                totalWinningAmount += tickets[i].amount;
                winnerCount++;
            }
        }

        // 如果有获胜者，分发ERC20代币奖励
        if (winnerCount > 0 && totalWinningAmount > 0) {
            for (uint256 i = 0; i < winnerCount; i++) {
                uint256 tokenId = winnerTokenIds[i];
                address winner = ownerOf(tokenId);
                uint256 reward = (tickets[tokenId].amount * lottery.prizePool )/ totalWinningAmount - ticketPrice;
                
                if (reward > 0) {
                    require(myERC20.transferFrom(manager, winner, reward), "Reward transfer failed");
                }
            }
        }

        emit LotteryClosed(lotteryId);
    }
}
//npx hardhat compile
//npx hardhat run ./scripts/deploy.ts --network ganache