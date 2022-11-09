import React, {useEffect, useState} from 'react'

import {ethers} from 'ethers'
import './SimpleAuction.css'
import contract from './contracts/SimpleAuction.json';
import LoadingSpinner from "./LoadingSpinner";

const abi = contract.abi;
const contractAddress = '0xddfB2107b54757CF3D200466b7E71ea0E7588A1A';

const SimpleAuction = () => {

  const [errorMessage, setErrorMessage] = useState(null);
  const [defaultAccount, setDefaultAccount] = useState(null);
  const [userBalance, setUserBalance] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [contract, setContract] = useState();
  const [auctionStarted, setAuctionStarted] = useState(false);
  const [item, setItem] = useState('');
  const [currentItem, setCurrentItem] = useState('');
  const [currentBid, setCurrentBid] = useState(0);
  const [currentBidder, setCurrentBidder] = useState('');
  const [bid, setBid] = useState(0);
  const [owner, setOwner] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [winnerList, setWinnerList] = useState([]);

  useEffect(() => {
    if (!walletConnected) {
      return;
    }
    const {ethereum} = window;
    if (!ethereum) {
      return;
    }
    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();
    const smartContract = new ethers.Contract(contractAddress, abi, signer);
    const instance = smartContract.connect(signer);
    setContract(instance);

  }, [walletConnected]);

  useEffect(() => {
    if (!contract) {
      return;
    }

    contract.on('AuctionStarted', handleAuctionStarted);
    contract.on('AuctionEnded', handleAuctionEnded);
    contract.on('HighestBidIncreased', handleHighestBidIncreased);

    initAuction(contract);

    return () => {
      contract.off('AuctionStarted', handleAuctionStarted);
      contract.off('AuctionEnded', handleAuctionEnded);
      contract.off('HighestBidIncreased', handleHighestBidIncreased);
    }

  }, [contract]);

  const handleAuctionStarted = (owner, item, currentBid) => {
    console.log('AuctionStarted');

    setOwner(owner);
    setCurrentItem(item);
    setCurrentBid(ethers.utils.formatUnits(currentBid, 'gwei'));
    setAuctionStarted(true);
    setItem('');

    setIsLoading(false);
    getAccountBalance(defaultAccount.toString());
  }

  const handleAuctionEnded = (item, winner, amount) => {
    console.log('AuctionEnded');

    const newList = [];
    newList.push(winnerList, {
      'item': item,
      'winner': winner,
      'amount': ethers.utils.formatUnits(amount, 'gwei')
    });
    setWinnerList(newList);
    setAuctionStarted(false);

    setIsLoading(false);
    getAccountBalance(defaultAccount.toString());
  }

  const handleHighestBidIncreased = (bidder, amount) => {
    console.log('HighestBidIncreased');
    console.log(bidder);
    console.log(amount);
    setCurrentBid(ethers.utils.formatUnits(amount, 'gwei'));
    setCurrentBidder(bidder);
    getAccountBalance(defaultAccount.toString());
    setIsLoading(false);
  }

  const initAuction = async (contract) => {
    const started = await contract.started();
    setAuctionStarted(started);

    if (started) {
      const owner = await contract.owner();
      const item = await contract.itemName();
      const highestBid = await contract.highestBid();
      const highestBidder = await contract.highestBidder();

      setOwner(owner);
      setCurrentItem(item);
      setCurrentBid(ethers.utils.formatUnits(highestBid, 'gwei'));
      setCurrentBidder(highestBidder);
      setItem('');
    }
  }

  const onNameChange = (event) => {
    setItem(event.target.value);
  }

  const registerAuction = async () => {
    if (!contract) {
      return;
    }
    setErrorMessage('');

    try {
      setIsLoading(true);
      await contract.startAuction(item, defaultAccount);

    } catch (e) {
      setIsLoading(false);
      getAccountBalance(defaultAccount.toString());
      setErrorMessage('먼저 신청된 경매가 있습니다.');
    }
  }

  const onBidChange = (event) => {
    setBid(event.target.value);
  }

  const requestBid = async () => {
    if (!contract) {
      return;
    }
    setErrorMessage('');

    try {
      setIsLoading(true);
      const options = {value: ethers.utils.parseUnits(bid + '', 'gwei'), gasLimit: 5000000}
      await contract.bid(options);

    } catch (e) {
      setIsLoading(false);
      getAccountBalance(defaultAccount.toString());
      console.log(e);
    }
  }

  const endAuction = async () => {
    if (!contract) {
      return;
    }
    setErrorMessage('');

    try {
      await contract.auctionEnd();
      setIsLoading(true);

    } catch (e) {
      setIsLoading(false);
      getAccountBalance(defaultAccount.toString());
      console.log(e);
    }
  }

  const connectWalletHandler = () => {
    if (window.ethereum && window.ethereum.isMetaMask) {
      console.log('MetaMask installed');

      window.ethereum.request({method: 'eth_requestAccounts'})
        .then(result => {
          accountChangedHandler(result[0]);
          setWalletConnected(true);
          getAccountBalance(result[0]);
        })
        .catch(error => {
          setErrorMessage(error.message);
        });

    } else {
      console.log('Need to install MetaMask');
      setErrorMessage('Please install MetaMask browser extension to interact');
    }
  }

  const accountChangedHandler = (newAccount) => {
    setDefaultAccount(newAccount);
    getAccountBalance(newAccount.toString());
  }

  const getAccountBalance = (account) => {
    window.ethereum.request({method: 'eth_getBalance', params: [account, 'latest']})
      .then(balance => {
        setUserBalance(ethers.utils.formatEther(balance));
      })
      .catch(error => {
        setErrorMessage(error.message);
      });
  };

  const chainChangedHandler = () => {
    window.location.reload();
  }

  useEffect(() => {
    if (!window.ethereum) {
      return;
    }

    window.ethereum.on('accountsChanged', accountChangedHandler);
    window.ethereum.on('chainChanged', chainChangedHandler);
  }, []);

  return (
    <>
      <div className='walletCard'>
        {!walletConnected
          ? <button onClick={connectWalletHandler}>지갑 연결</button>
          : <>
            <div className='accountDisplay'>
              <h3>지갑 주소: {defaultAccount}</h3>
            </div>
            <div className='balanceDisplay'>
              <h3>잔액: {userBalance}</h3>
            </div>
          </>
        }
      </div>
      {!!walletConnected &&
        <div className='auction'>
          {!!auctionStarted ?
            <>
              <h3>경매 시작</h3>
              판매자 ID: <b>{owner}</b>
              <br />
              현재 물품: <b>{currentItem}</b>
              <br />
              입찰 금액: <b>{currentBid}</b>
              <br />
              입찰자 ID: <b>{currentBidder}</b>
              <br />
              <br />
              입찰: <input type={"text"} onChange={onBidChange} value={bid} disabled={isLoading} />
              <span>  </span>
              <button onClick={requestBid} disabled={isLoading}>입찰 신청</button>
              {!!isLoading &&
                <>
                  <br /><br /><LoadingSpinner />
                </>}
              <br />
              <br />
              <button onClick={endAuction} disabled={isLoading}>경매 종료</button>
            </>
            :
            <>
              <h3>경매 종료</h3>
              물품명: <input type={"text"} onChange={onNameChange} value={item} disabled={isLoading} />
              <span>  </span>
              <button onClick={registerAuction} disabled={isLoading}>경매 등록</button>
              {!!isLoading &&
                <>
                  <br /><br /><LoadingSpinner />
                </>}
            </>
          }
        </div>
      }
      <br />
      {errorMessage}
      <br />
      <br />
      <div>
        {winnerList.length > 0 &&
          winnerList.map((winner, idx) => !!winner.winner ?
            <span key={idx}>
              1. 물품: <b>{winner.item}</b>
              <br />
              낙찰자: <b>{winner.winner}</b>
              <br />
              금액: <b>{winner.amount}</b>
              <br />
              <br />
            </span> : <></>
          )
        }
      </div>
    </>
  );
}

export default SimpleAuction;