const ERC20 = artifacts.require("ERC20Mock");
// Balancer imports
const ConfigurableRightsPool = artifacts.require("ConfigurableRightsPool");
const BFactory = artifacts.require("BFactory");
const CRPFactory = artifacts.require("CRPFactory");
const BalancerSafeMath = artifacts.require("BalancerSafeMath");
const RightsManager = artifacts.require("RightsManager");
const SmartPoolManager = artifacts.require("SmartPoolManager");
const BalancerProxy = artifacts.require("BalancerProxy");
const PrimeToken = artifacts.require("PrimeToken");

const MAX = web3.utils.toTwosComplement(-1);

const { toWei } = web3.utils;
const PRIME_CAP = toWei("90000000");
const PRIME_SUPPLY = toWei("21000000");

const initialize = async (root) => {
  const setup = {};
  setup.root = root;
  setup.data = {};
  setup.data.balances = [];
  return setup;
};

const tokens = async (setup) => {
  const erc20s = [
    await ERC20.new("DAI Stablecoin", "DAI", 18),
    await ERC20.new("USDC Stablecoin", "USDC", 15),
    await ERC20.new("USDT Stablecoin", "USDT", 18),
  ];

  const primeToken = await PrimeToken.new(PRIME_SUPPLY, PRIME_CAP, setup.root);

  return { erc20s, primeToken };
};

const balancer = async (setup) => {
  // deploy balancer infrastructure
  const bfactory = await BFactory.new();

  const balancerSafeMath = await BalancerSafeMath.new();
  const rightsManager = await RightsManager.new();
  const smartPoolManager = await SmartPoolManager.new();

  await CRPFactory.link("BalancerSafeMath", balancerSafeMath.address);
  await CRPFactory.link("RightsManager", rightsManager.address);
  await CRPFactory.link("SmartPoolManager", smartPoolManager.address);

  const crpFactory = await CRPFactory.new();

  const usdc = await setup.tokens.erc20s[1];
  const dai = await setup.tokens.erc20s[0];
  const primetoken = await setup.tokens.primeToken;
  const usdt = await setup.tokens.erc20s[2];

  const USDC = await usdc.address;
  const DAI = await dai.address;
  const PRIMEToken = await primetoken.address;

  const tokenAddresses = [PRIMEToken, DAI, USDC];

  const swapFee = 10 ** 15;
  const startWeights = [toWei("8"), toWei("1"), toWei("1")];
  const startBalances = [toWei("10000"), toWei("5000"), toWei("5000")];
  const SYMBOL = "BPOOL";
  const NAME = "Prime Balancer Pool Token";

  const permissions = {
    canPauseSwapping: true,
    canChangeSwapFee: true,
    canChangeWeights: true,
    canAddRemoveTokens: true,
    canWhitelistLPs: false,
  };

  const poolParams = {
    poolTokenSymbol: SYMBOL,
    poolTokenName: NAME,
    constituentTokens: tokenAddresses,
    tokenBalances: startBalances,
    tokenWeights: startWeights,
    swapFee: swapFee,
  };

  POOL = await crpFactory.newCrp.call(
    bfactory.address,
    poolParams,
    permissions
  );

  await crpFactory.newCrp(bfactory.address, poolParams, permissions);

  const pool = await ConfigurableRightsPool.at(POOL);

  await usdc.approve(POOL, MAX);
  await dai.approve(POOL, MAX);
  await primetoken.approve(POOL, MAX);

  await pool.createPool(toWei("1000"), 10, 10);

  // move ownership to avatar
  await pool.setController(setup.organization.avatar.address);

  // deploy proxy
  const proxy = await BalancerProxy.new();
  // initialize proxy
  await proxy.initialize(
    setup.organization.avatar.address,
    pool.address,
    await pool.bPool()
  );

  return { pool, proxy };
};

module.exports = {
  initialize,
  tokens,
  balancer,
};
