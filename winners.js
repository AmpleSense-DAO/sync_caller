const Web3 = require('web3');
var HDWalletProvider = require("truffle-hdwallet-provider");
const express = require('express')
const app = express()
const CONF = require("./conf.json")

const port = CONF.port;

app.listen(port, async () => {
  await query(CONF.infura_api_key, "0x0EAdf5c82b50E3D028E0eB10CF76676432A7AD51", 11446422)
  
});

//get a random winner by computing the list top score and using it as max random value
//then randomly traverse array until we find a user with a higher or equal score than the max
function getWinner(myArray) {
  let topScore = BigInt(0)
  myArray.forEach(el => {
    if(el.score > topScore)
      topScore = el.score
  })
  max = Number(topScore)
  let random = BigInt(Math.floor(Math.random() * max));
  let randomizedOrder = [...myArray].sort((a,b) => { return Math.floor(Math.random()*2) - 1})
  for(let i = 0; i < randomizedOrder.length - 1; i++) {
    if(randomizedOrder[i].score >= random)
      return myArray.indexOf(randomizedOrder[i])
  }
  return -1
}

let query = async (infura_key, geyser_address, snapshot_block) => {
  //setup
  const geyser_abi = [{"anonymous":false,"inputs":[{"indexed":true,"name":"user","type":"address"},{"indexed":false,"name":"amount","type":"uint256"},{"indexed":false,"name":"total","type":"uint256"},{"indexed":false,"name":"data","type":"bytes"}],"name":"Staked","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"user","type":"address"},{"indexed":false,"name":"amount","type":"uint256"},{"indexed":false,"name":"total","type":"uint256"},{"indexed":false,"name":"data","type":"bytes"}],"name":"Unstaked","type":"event"}]
  var provider = new HDWalletProvider(CONF.pk, "https://mainnet.infura.io/v3/" + infura_key);
  let web3 = new Web3(provider)
  let geyser = new web3.eth.Contract(geyser_abi, geyser_address)
  //fetch staking events up to the snapshot block
  let staked = await geyser.getPastEvents("Staked", { fromBlock: 0, toBlock: snapshot_block })
  let unstaked = await geyser.getPastEvents("Unstaked", { fromBlock: 0, toBlock: snapshot_block })

  //compute user balances based on the events
  let balances = new Map()

  staked.map(stake => {
    //first time user entry
    if(!balances.get(stake.returnValues.user))
      balances.set(stake.returnValues.user, {stakes : [], unstakes : [], total : BigInt(0), score : BigInt(0), max : BigInt(0), entryBlock : BigInt(0), exitBlock : BigInt(0)})
    //add stake data to the stakes array
    balances.get(stake.returnValues.user).stakes.push({amount : BigInt(stake.returnValues.amount), block : stake.blockNumber})
    //add the amount to the user staking total
    balances.get(stake.returnValues.user).total += BigInt(stake.returnValues.amount)
    //if its the first stake, register entry block
    if(balances.get(stake.returnValues.user).entryBlock == BigInt(0)) {
      balances.get(stake.returnValues.user).entryBlock = BigInt(stake.blockNumber)
    }
  })

  unstaked.map(unstake => {
    //add unstake data to the unstakes array
    balances.get(unstake.returnValues.user).unstakes.push({ amount : BigInt(-unstake.returnValues.amount), block : unstake.blockNumber})
    //remove the amount from the user staking total
    balances.get(unstake.returnValues.user).total -= BigInt(unstake.returnValues.amount)
    //update exit block
    if(balances.get(unstake.returnValues.user).total == BigInt(0))
      balances.get(unstake.returnValues.user).exitBlock = BigInt(unstake.blockNumber)
  })

  //compute user scores
  balances.forEach((value, key) => {
    //compute max reached stake amount
    let all = value.stakes.concat(value.unstakes)
    all.sort((a,b) => {
      if(a.blockNumber < b.blockNumber) return -1;
      if(a.blockNumber > b.blockNumber) return 1;
      return 0;
    })
    let max = BigInt(0)
    let total = BigInt(0)
    all.forEach(el => {
      total += el.amount
      if(total > max)
        max = total
    })
    value.max = max

    //number of blocks between entry and exit
    let diff = (value.exitBlock > BigInt(0)?value.exitBlock : BigInt(snapshot_block)) - value.entryBlock
    //score is the staking time
    value.score = diff
  })

  //create the potential winners list
  let sorted = []
  balances.forEach((balance, key) => {
    let max = balance.max
    let score = balance.score
    sorted.push({max, score, key})
  })

  //sort the users by peak stake
  sorted.sort((a,b) => {
    if(a.max < b.max) return 1;
    if(a.max > b.max) return -1;
    return 0;
  })

  //divide users in 3 cohorts
  let gold=sorted.splice(0, 33)
  let silver=sorted.splice(0, 33)
  let bronze=sorted.splice(0, 33)

  // distribute gold tokens
  let winners = []
  let tokens = 15;
  while(tokens > 0) {
    let winner = getWinner(gold)
    winners.push({status : "gold", address : gold[winner].key, max : gold[winner].max, score : gold[winner].score});
    gold.splice(winner,1)
    tokens--
  }

  // distribute silver tokens
  tokens = 8;
  while(tokens > 0) {
    let winner = getWinner(silver)
    winners.push({status : "silver", address : silver[winner].key, max : silver[winner].max, score : silver[winner].score});
    silver.splice(winner,1)
    tokens--
  }

  // distribute bronze tokens
  tokens = 2;
  while(tokens > 0) {
    let winner = getWinner(bronze)
    winners.push({status : "bronze", address : bronze[winner].key, max : bronze[winner].max, score : bronze[winner].score});
    bronze.splice(winner,1)
    tokens--
  }

  //generate csv output
  let csv = "address,max,stakig time,cohort\n"

  winners.forEach(winner => {
    csv += "\"" + winner.address + "\"," + winner.max + "," + winner.score + "," + winner.status + "\n"
  })

  //contains the text to copy paste into an empty .csv file to generate the excel sheet
  console.log(csv)

  return winners;
}
