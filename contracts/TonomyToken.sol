// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20SnapshotUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";


contract TonomyToken is Initializable, ERC20SnapshotUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    
    uint256 public constant INITIAL_SUPPLY = 100_000_000 ether;
    address public bridge;
    address public mintTo;

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
        bridge = owner();
        mintTo = owner();
        _mint(mintTo, INITIAL_SUPPLY);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function setBridge(address _bridge) external onlyOwner {
        require(_bridge != address(0), "Invalid bridge address");
        bridge = _bridge;
    }

    function bridgeMint(address to, uint256 amount) external onlyBridge {
        _mint(to, amount);
    }

    function bridgeBurn(address from, uint256 amount) external onlyBridge {
        _burn(from, amount);
    }

    // ─── Internal Transfer Check ────────────────────────────────────────────────
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override(ERC20SnapshotUpgradeable) {
        super._beforeTokenTransfer(from, to, amount);
    }
}
