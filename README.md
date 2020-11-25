# Amplesense Sync caller script

This script checks for rebase on AMPL contract by tracking total token supply : 0xD46bA6D942050d489DBd938a2C909A5d5039A161
It operates at a given interval. This interval should be small enough for a quick reaction time, but not too small so the sent transaction has time to get executed.

We use HTTP with a loop over WS subscription for resilience. A subscription on LogRebase is also possible though and will allow for a quicker reaction time.

## Quick start

### Clone repo
```
git clone https://github.com/stalker474/sync_caller
```

### Install npm
#### Linux
```
sudo apt install npm
```

### Install dependencies
```
cd sync_caller
npm install
```

### Configure
Set the {PRIVATE KEY} and {INFURA API KEY} values in conf.json
The PKs' account should be provisioned with enough eth for gas

Here is more on the configuration values

"pk" : Private key of the account to use for the script
"ufragments_address" : AMPL contract address
"pair_address" : Uniswap pair address
"infura_api_key" : Infura api key
"defaut_gas_price" : Gas price used if failed to fetch the optimal gas price data
"max_gas_price" : Maximum allowed gas price cap
"max_gas" : Amount of gas to be sent with the transaction
"max_gas_fetch_tries" : Number of tries to fetch gas price before using default value
"max_pending_transaction_tries" : Number of tries to wait for a pending transaction before accelerating it
"port" : Port on which to run the server
"frequency" : Frequency in ms of the rebase checking process

### Run

#### Normal run
```
npm run start
```

#### Detached from terminal run
```
nohup npm run start&
```

### Access log

In normal run, the log will appear in console.
In detached from terminal run, the log will appear in the nohup.out file.
You can also access the log by going on the server page : by default : http://localhost:3000