// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20SnapshotUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/TokenTimelock.sol";

contract TonomyToken is Initializable, ERC20SnapshotUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {

    uint256 public constant INITIAL_SUPPLY = 100_000_000 ether;

    mapping(address => bool) public isBlacklisted;
    mapping(address => address[]) public timelocks;

    address public bridge;

    modifier notBlacklisted(address from, address to) {
        require(!isBlacklisted[from] && !isBlacklisted[to], "TonomyToken: blacklisted");
        _;
    }

    modifier onlyBridge() {
        require(msg.sender == bridge, "TonomyToken: caller is not the bridge");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __ERC20_init("Tonomy Token", "TONO");
        __ERC20Snapshot_init();
        __Ownable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _mint(address(this), INITIAL_SUPPLY);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ─── Standard Admin Functions ───────────────────────────────────────────────

    function snapshot() external onlyOwner {
        _snapshot();
    }

    function setBlacklist(address[] calldata addrs, bool[] calldata states) external onlyOwner {
        require(addrs.length == states.length, "Array lengths mismatch");
        for (uint256 i = 0; i < addrs.length; i++) {
            isBlacklisted[addrs[i]] = states[i];
        }
    }

    function setBridge(address _bridge) external onlyOwner {
        require(_bridge != address(0), "Invalid bridge address");
        bridge = _bridge;
    }

    // ─── Bridge-Only Mint & Burn ────────────────────────────────────────────────

    function bridgeMint(address to, uint256 amount) external onlyBridge {
        _mint(to, amount);
    }

    function bridgeBurn(address from, uint256 amount) external onlyBridge {
        _burn(from, amount);
    }

    // ─── Timelock & Distribution ───────────────────────────────────────────────

    function promiseToken(address beneficiary, uint256 amount, uint256 releaseTime) external onlyOwner {
        require(!isBlacklisted[beneficiary], "TonomyToken: blacklisted");
        require(releaseTime > block.timestamp, "Invalid release time");
        require(balanceOf(address(this)) >= amount, "Not enough tokens");

        TokenTimelock timelock = new TokenTimelock(IERC20(address(this)), beneficiary, releaseTime);
        timelocks[beneficiary].push(address(timelock));
        _transfer(address(this), address(timelock), amount);
    }

    function releaseTimelock(address timelockAddress) external nonReentrant {
        TokenTimelock timelock = TokenTimelock(timelockAddress);
        require(address(timelock.token()) == address(this), "Invalid token");
        require(timelock.beneficiary() == msg.sender, "Not beneficiary");
        timelock.release();
    }

    function airdrop(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "Length mismatch");
        for (uint256 i = 0; i < recipients.length; i++) {
            require(!isBlacklisted[recipients[i]], "Recipient blacklisted");
            _transfer(address(this), recipients[i], amounts[i]);
        }
    }

    function safeTransfer(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");
        _transfer(address(this), to, amount);
    }

    // ─── Internal Transfer Check ────────────────────────────────────────────────

    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20SnapshotUpgradeable)
        notBlacklisted(from, to)
    {
        super._beforeTokenTransfer(from, to, amount);
    }
}
