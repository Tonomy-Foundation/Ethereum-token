// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20SnapshotUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title TonomyToken
 * @notice ERC20 with snapshot + upgradeability + bridge mint/burn,
 *         plus launch controls / anti-sniping similar to the provided example:
 *         - trading gate (pool-related transfers blocked until enabled)
 *         - launch period sell block (only LP can sell to pool)
 *         - per-wallet buy cap from pool during launch
 *         - cooldown between buys from pool
 *         - time-boxed anti-sniping auto-blacklist on buys from pool
 *         - manual blacklist admin & LP/pool configuration
 *
 * Important: restrictions never affect mint/burn or transfers involving the LP wallet.
 */
contract TonomyToken is
    Initializable,
    ERC20SnapshotUpgradeable,
    ERC20PausableUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    // --- Existing state ---
    uint256 public constant INITIAL_SUPPLY = 100_000_000 ether;
    address public bridge;
    address public mintTo;
    address public antiSnipingManager; // EOA for rapid anti-sniping actions

    // --- Anti-sniping / launch control state ---
    bool public isLaunchPeriodEnabled;   // launch-period restrictions active
    bool public tradingEnabled;          // pool-related transfers allowed
    bool public cooldownEnabled;         // buy cooldown active

    address public poolAddress;          // DEX pool address (e.g., UniV2/V3)
    address public lpWallet;             // liquidity provider wallet (exempt)

    uint128 public perWalletBuyCap;      // max bought from pool per wallet during launch
    uint64  public liquidityAddedTimestamp; // when liquidity was added
    uint32  public cooldownSeconds;      // min seconds between buys from pool
    uint32  public antiSnipingSeconds;   // auto-blacklist window after liquidity

    mapping(address => bool) public blacklistedWallets;
    mapping(address => uint256) public lastBuyTimestamp; // last pool->wallet buy time
    mapping(address => uint256) public walletBuyAmount;  // cumulative bought during launch

    // --- Events ---
    event LaunchPeriodEnabled(bool enabled);
    event PerWalletBuyCapSet(uint128 amount);
    event TradingEnabled(bool enabled);
    event CooldownSet(bool enabled, uint32 seconds_);
    event LiquidityAdded(uint64 timestamp);
    event AntiSnipingSecondsSet(uint32 seconds_);
    event LpWalletSet(address wallet);
    event PoolAddressSet(address pool);
    event WalletBlacklisted(address wallet, bool status);
    event AntiSnipingManagerSet(address manager);

    // --- Custom Errors (gas efficient reverts) ---
    error SellsBlocked();
    error TradingNotEnabled();
    error CooldownActive();
    error WalletIsBlacklisted(address from, address to);
    error PerWalletBuyCapExceeded();
    error AddressCannotBeZero();
    error UnauthorizedAntiSnipingAction();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __ERC20_init("Tonomy Token", "TONO");
        __ERC20Snapshot_init();
        __ERC20Pausable_init();
        __Ownable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        bridge = owner();
        mintTo = owner();
        antiSnipingManager = owner(); // default to owner
        _mint(mintTo, INITIAL_SUPPLY);

        // --- Launch control sensible defaults ---
        isLaunchPeriodEnabled = true;
        tradingEnabled = false;                // block pool interactions until enabled
        cooldownEnabled = true;

        cooldownSeconds = 300;                 // 5 minutes
        antiSnipingSeconds = 300;              // 5 minutes
        perWalletBuyCap = uint128(INITIAL_SUPPLY / 100); // 1% of initial supply

        lpWallet = owner();                    // default LP wallet
        // poolAddress and liquidityAddedTimestamp set later
    }

    // --- UUPS ---
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // --- Bridge role ---
    modifier onlyBridge() {
        require(msg.sender == bridge, "TonomyToken: caller is not the bridge");
        _;
    }

    // --- Anti-sniping manager role ---
    modifier onlyOwnerOrAntiSnipingManager() {
        if (msg.sender != owner() && msg.sender != antiSnipingManager) {
            revert UnauthorizedAntiSnipingAction();
        }
        _;
    }

    function setBridge(address _bridge) external onlyOwner {
        if (_bridge == address(0)) revert AddressCannotBeZero();
        bridge = _bridge;
    }

    function bridgeMint(address to, uint256 amount) external onlyBridge {
        _mint(to, amount);
    }

    function bridgeBurn(address from, uint256 amount) external onlyBridge {
        _burn(from, amount);
    }

    // --- Admin: pause/unpause using standardized OZ Pausable ---
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // --- Admin: launch controls / config ---
    function setLaunchPeriodEnabled(bool _enabled) external onlyOwner {
        isLaunchPeriodEnabled = _enabled;
        emit LaunchPeriodEnabled(_enabled);
    }

    function setPerWalletBuyCap(uint128 _amount) external onlyOwner {
        perWalletBuyCap = _amount;
        emit PerWalletBuyCapSet(_amount);
    }

    function setTradingEnabled(bool _enabled) external onlyOwner {
        tradingEnabled = _enabled;
        emit TradingEnabled(_enabled);
    }

    function setCooldownEnabled(bool _enabled, uint32 _seconds) external onlyOwner {
        cooldownEnabled = _enabled;
        cooldownSeconds = _seconds;
        emit CooldownSet(_enabled, _seconds);
    }

    function setLiquidityAdded() external onlyOwner {
        liquidityAddedTimestamp = uint64(block.timestamp);
        emit LiquidityAdded(liquidityAddedTimestamp);
    }

    function setAntiSnipingSeconds(uint32 _seconds) external onlyOwner {
        antiSnipingSeconds = _seconds;
        emit AntiSnipingSecondsSet(_seconds);
    }

    function setLpWallet(address _lpWallet) external onlyOwner {
        if (_lpWallet == address(0)) revert AddressCannotBeZero();
        lpWallet = _lpWallet;
        emit LpWalletSet(_lpWallet);
    }

    function setPoolAddress(address _poolAddress) external onlyOwner {
        if (_poolAddress == address(0)) revert AddressCannotBeZero();
        poolAddress = _poolAddress;
        emit PoolAddressSet(_poolAddress);
    }

    function setAntiSnipingManager(address _antiSnipingManager) external onlyOwner {
        if (_antiSnipingManager == address(0)) revert AddressCannotBeZero();
        antiSnipingManager = _antiSnipingManager;
        emit AntiSnipingManagerSet(_antiSnipingManager);
    }

    function setWalletBlacklisted(address _wallet, bool _status) external onlyOwnerOrAntiSnipingManager {
        blacklistedWallets[_wallet] = _status;
        emit WalletBlacklisted(_wallet, _status);
    }

    function batchBlacklistWallets(address[] calldata _wallets, bool _status) external onlyOwnerOrAntiSnipingManager {
        for (uint256 i = 0; i < _wallets.length; i++) {
            blacklistedWallets[_wallets[i]] = _status;
            emit WalletBlacklisted(_wallets[i], _status);
        }
    }

    function resetWalletBuyAmount(address[] calldata _wallets) external onlyOwnerOrAntiSnipingManager {
        for (uint256 i = 0; i < _wallets.length; i++) {
            walletBuyAmount[_wallets[i]] = 0;
        }
    }

    // --- Views ---
    function isLaunchPeriodActive() public view returns (bool) {
        return isLaunchPeriodEnabled;
    }

    function isAntiSnipingPeriodActive() public view returns (bool) {
        return liquidityAddedTimestamp > 0
            && block.timestamp < liquidityAddedTimestamp + antiSnipingSeconds;
    }

    function getRemainingAntiSnipingSeconds() external view returns (uint256) {
        if (!isAntiSnipingPeriodActive()) return 0;
        return (liquidityAddedTimestamp + antiSnipingSeconds) - block.timestamp;
    }

    function canTrade(address _addr) external view returns (bool) {
        return !blacklistedWallets[_addr] && tradingEnabled;
    }

    function isBlacklisted(address _addr) external view returns (bool) {
        return blacklistedWallets[_addr];
    }

    function isPoolAddressSet() external view returns (bool) {
        return poolAddress != address(0);
    }

    function getWalletBuyAmount(address _wallet) external view returns (uint256) {
        return walletBuyAmount[_wallet];
    }

    function getRemainingBuyCapacity(address _wallet) external view returns (uint256) {
        if (!isLaunchPeriodEnabled || _wallet == lpWallet) {
            return type(uint256).max;
        }
        uint256 bought = walletBuyAmount[_wallet];
        if (bought >= perWalletBuyCap) return 0;
        return perWalletBuyCap - bought;
    }

    // --- Core transfer gatekeeping ---
    function _validateTransfer(address from, address to, uint256 amount) internal view {
        // Skip checks for mint/burn
        if (from == address(0) || to == address(0)) return;

        // LP wallet bypass
        if (from == lpWallet || to == lpWallet) return;

        // Blacklist check
        if (blacklistedWallets[from] || blacklistedWallets[to]) {
            revert WalletIsBlacklisted(from, to);
        }

        address _pool = poolAddress;

        // Trading gate: block any pool-related transfer until enabled
        if (!tradingEnabled && _pool != address(0)) {
            if (from == _pool || to == _pool) {
                revert TradingNotEnabled();
            }
        }

        // Launch-period rules
        if (isLaunchPeriodEnabled && _pool != address(0)) {
            // Block sells to pool (except LP wallet handled above)
            if (to == _pool) {
                revert SellsBlocked();
            }
            // Per-wallet buy cap for pool -> wallet buys
            if (from == _pool) {
                if (walletBuyAmount[to] + amount > perWalletBuyCap) {
                    revert PerWalletBuyCapExceeded();
                }
            }
        }

        // Cooldown for buys from pool
        if (cooldownEnabled && _pool != address(0) && from == _pool) {
            uint256 last = lastBuyTimestamp[to];
            if (last != 0 && block.timestamp - last < cooldownSeconds) {
                revert CooldownActive();
            }
        }
    }

    /**
     * Hook order:
     * 1) Validate (no state changes)
     * 2) super._beforeTokenTransfer (includes Pausable + Snapshot bookkeeping)
     * 3) Update buy tracking / anti-sniping flags (state changes)
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    )
        internal
        override(ERC20SnapshotUpgradeable, ERC20PausableUpgradeable)
    {
        _validateTransfer(from, to, amount);

        // Let Pausable + Snapshot do their checks/bookkeeping
        super._beforeTokenTransfer(from, to, amount);

        // Update tracking only for successful pool->wallet buys
        address _pool = poolAddress;
        if (
            _pool != address(0) &&
            from == _pool &&
            from != address(0) &&
            to != address(0) &&
            from != lpWallet &&
            to != lpWallet
        ) {
            if (isLaunchPeriodEnabled) {
                walletBuyAmount[to] += amount;
            }
            if (isAntiSnipingPeriodActive()) {
                blacklistedWallets[to] = true;
                emit WalletBlacklisted(to, true);
            }
            if (cooldownEnabled) {
                lastBuyTimestamp[to] = block.timestamp;
            }
        }
    }

    // --- Storage gap for future upgrades ---
    uint256[36] private __gap; // adjust gap to keep storage layout flexible
}
